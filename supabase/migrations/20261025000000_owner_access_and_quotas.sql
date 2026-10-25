-- Parseon backend contract: owner-only documents, a private document bucket and shared extraction quotas.
-- Written for a new, dedicated preview project. Before applying to an existing project, compare its current
-- documents table, bucket and policies with this file; it does not migrate or delete existing rows or objects.

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file_path text not null,
  doc_type text not null check (doc_type in ('Pay Stub', 'Bank Statement', 'Tax Return', 'Loan Application', 'Other')),
  extracted_data jsonb not null default '[]'::jsonb
    check (jsonb_typeof(extracted_data) = 'array' and pg_column_size(extracted_data) <= 262144),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The storage path is the save's idempotency key and must sit in the owner's folder.
  constraint documents_file_path_key unique (file_path),
  constraint documents_file_path_owner check (split_part(file_path, '/', 1) = user_id::text and file_path !~ '\.\.')
);

create index if not exists documents_user_created_idx on public.documents (user_id, created_at desc);

create or replace function public.documents_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists documents_touch_updated_at on public.documents;
create trigger documents_touch_updated_at before update on public.documents
  for each row execute function public.documents_touch_updated_at();

alter table public.documents enable row level security;

revoke all on public.documents from anon, authenticated;
grant select, insert, delete on public.documents to authenticated;
-- Owners may correct fields and type; the owner and stored file reference are immutable.
grant update (doc_type, extracted_data) on public.documents to authenticated;

drop policy if exists documents_select_own on public.documents;
drop policy if exists documents_insert_own on public.documents;
drop policy if exists documents_update_own on public.documents;
drop policy if exists documents_delete_own on public.documents;
create policy documents_select_own on public.documents for select to authenticated
  using ((select auth.uid()) = user_id);
create policy documents_insert_own on public.documents for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy documents_update_own on public.documents for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy documents_delete_own on public.documents for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Private bucket matching the extraction limits. Signed URLs are created per owner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 2097152, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists documents_objects_select_own on storage.objects;
drop policy if exists documents_objects_insert_own on storage.objects;
drop policy if exists documents_objects_delete_own on storage.objects;
create policy documents_objects_select_own on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy documents_objects_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy documents_objects_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- No update policy: stored originals are never overwritten.

-- Shared extraction quotas, enforced before any provider request. Change limits with a reviewed update to this row.
create table if not exists public.extraction_quota_limits (
  singleton boolean primary key default true check (singleton),
  per_user_minute integer not null default 5 check (per_user_minute > 0),
  per_user_day integer not null default 40 check (per_user_day > 0),
  global_day integer not null default 400 check (global_day > 0)
);
insert into public.extraction_quota_limits (singleton) values (true) on conflict do nothing;

create table if not exists public.extraction_quota_usage (
  scope text not null,
  window_start timestamptz not null,
  used integer not null default 0,
  primary key (scope, window_start)
);
create index if not exists extraction_quota_usage_window_idx on public.extraction_quota_usage (window_start);

alter table public.extraction_quota_limits enable row level security;
alter table public.extraction_quota_usage enable row level security;
revoke all on public.extraction_quota_limits, public.extraction_quota_usage from anon, authenticated;

-- Returns 'ok' after reserving one extraction, or the exhausted limit without reserving anything.
create or replace function public.claim_extraction_quota() returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  limits public.extraction_quota_limits;
  day_start timestamptz := date_trunc('day', now(), 'UTC');
  minute_start timestamptz := date_trunc('minute', now());
  global_used integer;
  day_used integer;
  minute_used integer;
begin
  if uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  select * into strict limits from public.extraction_quota_limits where singleton;

  -- Rows are created and locked in a fixed order so concurrent claims serialize without deadlocks.
  insert into public.extraction_quota_usage (scope, window_start)
  values ('global', day_start), ('user-day:' || uid, day_start), ('user-minute:' || uid, minute_start)
  on conflict do nothing;
  select used into global_used from public.extraction_quota_usage
    where scope = 'global' and window_start = day_start for update;
  select used into day_used from public.extraction_quota_usage
    where scope = 'user-day:' || uid and window_start = day_start for update;
  select used into minute_used from public.extraction_quota_usage
    where scope = 'user-minute:' || uid and window_start = minute_start for update;

  if global_used >= limits.global_day then return 'global_day'; end if;
  if day_used >= limits.per_user_day then return 'user_day'; end if;
  if minute_used >= limits.per_user_minute then return 'user_minute'; end if;

  update public.extraction_quota_usage set used = used + 1
    where (scope = 'global' and window_start = day_start)
       or (scope = 'user-day:' || uid and window_start = day_start)
       or (scope = 'user-minute:' || uid and window_start = minute_start);
  delete from public.extraction_quota_usage where window_start < day_start - interval '2 days';
  return 'ok';
end $$;

revoke execute on function public.claim_extraction_quota() from public, anon;
grant execute on function public.claim_extraction_quota() to authenticated;
