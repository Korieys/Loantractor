// Emulated policy check: runs the migration in embedded Postgres with minimal stand-ins for Supabase's auth and
// storage schemas. It proves the SQL rules, not hosted Supabase behavior; repeat the isolation check on the preview backend.
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {beforeAll,beforeEach,describe,expect,it} from 'vitest';

const OWNER='00000000-0000-4000-8000-00000000000a',OTHER='00000000-0000-4000-8000-00000000000b';
const migration=readFileSync(new URL('./migrations/20261025000000_owner_access_and_quotas.sql',import.meta.url),'utf8');
const platform=`
create role anon nologin; create role authenticated nologin;
create schema auth; create schema storage;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text not null, owner uuid default auth.uid(), unique (bucket_id, name));
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
alter table storage.objects enable row level security;
grant usage on schema public, auth, storage to anon, authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
insert into auth.users values ('${OWNER}'), ('${OTHER}');
`;

let db;
async function as(user,sql,params){
 await db.exec(user?`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`:`set role anon; select set_config('request.jwt.claim.sub', '', false);`);
 try{return await db.query(sql,params);}finally{await db.exec('reset role;');}
}
const denied=promise=>expect(promise).rejects.toThrow(/permission denied|row-level security|violates/);
const save=(user,key,type='Other')=>as(user,`insert into public.documents (user_id, file_path, doc_type, extracted_data) values ($1, $2, $3, '[]') returning id`,[user,`${user}/${key}.pdf`,type]);

beforeAll(async()=>{db=new PGlite();await db.exec(platform);await db.exec(migration);},60000);
beforeEach(async()=>{await db.exec('truncate public.documents, public.extraction_quota_usage; delete from storage.objects; update public.extraction_quota_limits set per_user_minute = 5, per_user_day = 40, global_day = 400;');});

describe('document row isolation',()=>{
 it('lets each owner read, correct and delete only their own records',async()=>{
  const {rows:[mine]}=await save(OWNER,'a');await save(OTHER,'b');
  expect((await as(OWNER,'select file_path from public.documents')).rows).toEqual([{file_path:`${OWNER}/a.pdf`}]);
  expect((await as(OTHER,`update public.documents set extracted_data = '[{"field":"x"}]' where id = $1 returning id`,[mine.id])).rows).toEqual([]);
  expect((await as(OTHER,'delete from public.documents where id = $1 returning id',[mine.id])).rows).toEqual([]);
  expect((await as(OWNER,`update public.documents set doc_type = 'Tax Return' where id = $1 returning id`,[mine.id])).rows).toHaveLength(1);
  expect((await as(OWNER,'delete from public.documents where id = $1 returning id',[mine.id])).rows).toHaveLength(1);
 });
 it('refuses records written for another owner, another folder or by anonymous callers',async()=>{
  await denied(as(OTHER,`insert into public.documents (user_id, file_path, doc_type) values ($1, $2, 'Other')`,[OWNER,`${OWNER}/x.pdf`]));
  await denied(as(OWNER,`insert into public.documents (user_id, file_path, doc_type) values ($1, $2, 'Other')`,[OWNER,`${OTHER}/x.pdf`]));
  await denied(as(OWNER,`insert into public.documents (user_id, file_path, doc_type) values ($1, $2, 'Other')`,[OWNER,`${OWNER}/../x.pdf`]));
  await denied(as(null,'select * from public.documents'));
 });
 it('keeps the owner and stored file reference immutable after saving',async()=>{
  const {rows:[mine]}=await save(OWNER,'a');
  await denied(as(OWNER,'update public.documents set user_id = $1 where id = $2',[OTHER,mine.id]));
  await denied(as(OWNER,'update public.documents set file_path = $1 where id = $2',[`${OWNER}/b.pdf`,mine.id]));
 });
 it('turns a repeated save of the same file into a unique conflict the client can confirm',async()=>{
  await save(OWNER,'a');
  await expect(save(OWNER,'a')).rejects.toMatchObject({code:'23505'});
  expect((await as(OWNER,'select count(*)::int as n from public.documents')).rows[0].n).toBe(1);
 });
});

describe('stored file isolation',()=>{
 const upload=(user,name)=>as(user,`insert into storage.objects (bucket_id, name) values ('documents', $1) returning name`,[name]);
 it('creates a private bucket with the extraction size and type limits',async()=>{
  expect((await db.query(`select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'documents'`)).rows[0]).toEqual({public:false,file_size_limit:2097152,allowed_mime_types:['application/pdf','image/png','image/jpeg','image/webp']});
 });
 it('confines uploads, reads and deletions to the owner folder and never overwrites',async()=>{
  await upload(OWNER,`${OWNER}/a.pdf`);
  await denied(upload(OTHER,`${OWNER}/b.pdf`));
  await denied(upload(null,`${OWNER}/c.pdf`));
  expect((await as(OTHER,'select name from storage.objects')).rows).toEqual([]);
  expect((await as(OTHER,'delete from storage.objects returning name')).rows).toEqual([]);
  expect((await as(OWNER,`update storage.objects set name = name returning name`)).rows).toEqual([]);
  expect((await as(OWNER,'select name from storage.objects')).rows).toEqual([{name:`${OWNER}/a.pdf`}]);
  expect((await as(OWNER,'delete from storage.objects returning name')).rows).toHaveLength(1);
 });
});

describe('shared extraction quota',()=>{
 const claim=user=>as(user,'select public.claim_extraction_quota() as result').then(r=>r.rows[0].result);
 it('reserves per-user minute capacity and reports exhaustion without counting the refusal',async()=>{
  await db.exec('update public.extraction_quota_limits set per_user_minute = 2');
  expect([await claim(OWNER),await claim(OWNER),await claim(OWNER)]).toEqual(['ok','ok','user_minute']);
  expect(await claim(OTHER)).toBe('ok');
  const {rows}=await db.query(`select used from public.extraction_quota_usage where scope = 'global'`);
  expect(rows[0].used).toBe(3);
 });
 it('applies the daily per-user and shared global limits across accounts',async()=>{
  await db.exec('update public.extraction_quota_limits set per_user_day = 1, global_day = 2');
  expect([await claim(OWNER),await claim(OWNER)]).toEqual(['ok','user_day']);
  expect(await claim(OTHER)).toBe('ok');
  await db.exec(`insert into auth.users values ('00000000-0000-4000-8000-00000000000c')`);
  expect(await claim('00000000-0000-4000-8000-00000000000c')).toBe('global_day');
 });
 it('keeps quota state and limits out of reach of callers',async()=>{
  await expect(as(null,'select public.claim_extraction_quota()')).rejects.toThrow(/permission denied/);
  await denied(as(OWNER,'select * from public.extraction_quota_usage'));
  await denied(as(OWNER,'update public.extraction_quota_limits set global_day = 100000'));
 });
});
