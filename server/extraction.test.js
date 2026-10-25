import {afterEach,describe,it,expect,vi} from 'vitest';
import {extractionService,parseDocument,validateFields,extractionFailure,MAX_FILE_BYTES} from './extraction.js';
import vercelHandler from '../api/openai.js';
import {handler as netlifyHandler} from '../netlify/functions/openai-proxy.js';

const env={VITE_SUPABASE_URL:'https://fictional.supabase.co',VITE_SUPABASE_ANON_KEY:'fictional-public-key',OPENAI_API_KEY:'fictional-provider-key'};
const png=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
const request=(mime='image/png',bytes=png)=>({authorization:'Bearer fictional-user-token',body:{docType:'Other',dataUrl:`data:${mime};base64,${bytes.toString('base64')}`}});
const fields=[{field:'Amount',value:'Not Found',confidence:0}];
const provider=(overrides={})=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({data:fields})},...overrides}]});
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const quotaUrl=env.VITE_SUPABASE_URL+'/rest/v1/rpc/claim_extraction_quota';
const network=(quota=()=>response('ok'))=>vi.fn(async(url)=>{
 if(String(url).startsWith(env.VITE_SUPABASE_URL+'/auth/v1/user'))return response({id:'fictional-user',aud:'authenticated',email:'fictional@example.com'});
 if(String(url)===quotaUrl)return quota();
 if(url==='https://api.openai.com/v1/chat/completions')return response(provider());
 throw Error('Unmatched test network request');
});
afterEach(()=>vi.unstubAllGlobals());

describe('authenticated extraction boundary',()=>{
 it('rejects missing and malformed sessions before any auth or provider request',async()=>{
  const fetchImpl=network(),extract=extractionService({env,fetchImpl});
  for(const authorization of [undefined,'','Basic secret','Bearer one two'])await expect(extract({...request(),authorization})).rejects.toMatchObject({status:401});
  expect(fetchImpl).not.toHaveBeenCalled();
 });
 it('verifies the supplied token with Supabase and never sends an expired token to the provider',async()=>{
  const fetchImpl=vi.fn(async()=>response({message:'expired',code:'bad_jwt'},401));
  await expect(extractionService({env,fetchImpl})(request())).rejects.toMatchObject({status:401});
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  const [url,options]=fetchImpl.mock.calls[0];expect(String(url)).toContain('/auth/v1/user');
  expect(new Headers(options.headers).get('Authorization')).toBe('Bearer fictional-user-token');
 });
 it('fails closed for missing backend/provider configuration without a network call',async()=>{
  const fetchImpl=network();
  for(const missing of ['VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY','OPENAI_API_KEY'])await expect(extractionService({env:{...env,[missing]:''},fetchImpl})(request())).rejects.toMatchObject({status:503});
  expect(fetchImpl).not.toHaveBeenCalled();
 });
 it('rejects remote URLs, arbitrary models/prompts, malformed encodings and oversized files before provider use',async()=>{
  const extract=extractionService({env,fetchImpl:network()});
  for(const body of [null,[],{...request().body,model:'other'},{...request().body,dataUrl:'https://example.com/private.pdf'},{...request().body,dataUrl:'data:image/png;base64,YQ=='},{...request().body,dataUrl:'data:image/png;base64,abcd==='},{...request().body,docType:'Run my prompt'}])await expect(extract({...request(),body})).rejects.toMatchObject({status:400});
  await expect(extract(request('image/png',Buffer.alloc(MAX_FILE_BYTES+1)))).rejects.toMatchObject({status:413});
 });
 it('forwards images only after identity verification, fixes provider controls, and preserves zero confidence',async()=>{
  const fetchImpl=network(),result=await extractionService({env,fetchImpl})(request());
  expect(result).toEqual({data:fields});expect(fetchImpl).toHaveBeenCalledTimes(3);
  const [url,options]=fetchImpl.mock.calls[2],body=JSON.parse(options.body);
  expect(url).toBe('https://api.openai.com/v1/chat/completions');expect(options.headers.Authorization).toBe('Bearer fictional-provider-key');
  expect(body).toMatchObject({model:'gpt-4o',max_tokens:2500,store:false});
  expect(body.messages[1].content[1]).toEqual({type:'image_url',image_url:{url:request().body.dataUrl}});
  expect(options.signal).toBeInstanceOf(AbortSignal);expect(options.redirect).toBe('error');
 });
 it('sends PDF bytes as a PDF file part rather than an image URL',async()=>{
  const fetchImpl=network(),input=request('application/pdf',Buffer.from('%PDF-1.7\nSynthetic test only'));
  await extractionService({env,fetchImpl})(input);
  const body=JSON.parse(fetchImpl.mock.calls[2][1].body);
  expect(body.messages[1].content[1]).toEqual({type:'file',file:{filename:'document.pdf',file_data:input.body.dataUrl}});
 });
 it('rejects truncated, refused, empty or malformed extraction results',async()=>{
  for(const result of [provider({finish_reason:'length'}),provider({message:{refusal:'declined'}}),provider({message:{content:'not json'}}),provider({message:{content:'{"data":[]}'}}),provider({message:{content:'{"data":[{"field":"A","value":{},"confidence":2}]}'}})]){
   const fetchImpl=network();fetchImpl.mockImplementationOnce(async()=>response({id:'fictional-user'})).mockImplementationOnce(async()=>response('ok')).mockImplementationOnce(async()=>response(result));
   await expect(extractionService({env,fetchImpl})(request())).rejects.toMatchObject({status:502});
  }
 });
 it('does not expose provider errors, tokens, or document contents in failure responses',async()=>{
  const fetchImpl=network();fetchImpl.mockImplementationOnce(async()=>response({id:'fictional-user'})).mockImplementationOnce(async()=>response('ok')).mockImplementationOnce(async()=>response({error:'sensitive provider detail'},429));
  let failure;try{await extractionService({env,fetchImpl})(request());}catch(error){failure=extractionFailure(error);}
  expect(failure.status).toBe(429);expect(JSON.stringify(failure)).not.toContain('sensitive');
  expect(extractionFailure(new Error('fictional-secret'))).toEqual({status:503,body:{error:'Document processing could not finish. Please retry.'}});
 });
 it('keeps both deployed adapters private and rejects unsigned requests',async()=>{
  vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Network must not run');}));
  const res={status:vi.fn(function(code){this.code=code;return this;}),json:vi.fn(function(body){this.body=body;return this;}),setHeader:vi.fn()};
  await vercelHandler({method:'POST',headers:{},body:request().body},res);
  expect(res.code).toBe(401);expect(res.setHeader).toHaveBeenCalledWith('Cache-Control','private, no-store');
  const netlify=await netlifyHandler({httpMethod:'POST',headers:{},body:JSON.stringify(request().body)});
  expect(netlify.statusCode).toBe(401);expect(netlify.headers['Cache-Control']).toBe('private, no-store');
  expect((await netlifyHandler({httpMethod:'GET'})).statusCode).toBe(405);
 });
 it('reserves the shared quota with the caller session before provider use',async()=>{
  const fetchImpl=network();await extractionService({env,fetchImpl})(request());
  const [url,options]=fetchImpl.mock.calls[1];
  expect(String(url)).toBe(quotaUrl);expect(options.method).toBe('POST');
  expect(new Headers(options.headers).get('Authorization')).toBe('Bearer fictional-user-token');
 });
 it('refuses exhausted quotas with a retry interval and never contacts the provider',async()=>{
  for(const [reason,retryAfter] of [['user_minute',60],['user_day',3600],['global_day',3600]]){
   const fetchImpl=network(()=>response(reason));
   const error=await extractionService({env,fetchImpl})(request()).catch(error=>error);
   expect(error).toMatchObject({status:429,retryAfter});expect(fetchImpl).toHaveBeenCalledTimes(2);
  }
 });
 it('fails closed when the shared quota cannot be confirmed',async()=>{
  for(const quota of [()=>response({message:'function missing',code:'PGRST202'},404),()=>response(null),()=>{throw new TypeError('network down');}]){
   const fetchImpl=network(quota);
   await expect(extractionService({env,fetchImpl})(request())).rejects.toMatchObject({status:503});
   expect(fetchImpl.mock.calls.some(([url])=>url==='https://api.openai.com/v1/chat/completions')).toBe(false);
  }
 });
 it('passes quota retry intervals through both adapters',async()=>{
  vi.stubEnv('VITE_SUPABASE_URL',env.VITE_SUPABASE_URL);vi.stubEnv('VITE_SUPABASE_ANON_KEY',env.VITE_SUPABASE_ANON_KEY);vi.stubEnv('OPENAI_API_KEY',env.OPENAI_API_KEY);
  vi.stubGlobal('fetch',network(()=>response('user_minute')));
  const res={status:vi.fn(function(code){this.code=code;return this;}),json:vi.fn(function(body){this.body=body;return this;}),setHeader:vi.fn()};
  await vercelHandler({method:'POST',headers:{authorization:request().authorization},body:request().body},res);
  expect(res.code).toBe(429);expect(res.setHeader).toHaveBeenCalledWith('Retry-After','60');
  const netlify=await netlifyHandler({httpMethod:'POST',headers:{authorization:request().authorization},body:JSON.stringify(request().body)});
  expect(netlify.statusCode).toBe(429);expect(netlify.headers['Retry-After']).toBe('60');
  vi.unstubAllEnvs();
 });
 it('validates every supported file signature and rejects invalid confidence values',()=>{
  for(const [mime,bytes] of [['image/png',png],['image/jpeg',Buffer.from([255,216,255,0])],['image/webp',Buffer.from('RIFF0000WEBP')],['application/pdf',Buffer.from('%PDF-1.7')]])expect(parseDocument(request(mime,bytes).body).mime).toBe(mime);
  for(const confidence of [-1,1.1,NaN,'0.9',null])expect(()=>validateFields({data:[{field:'Test',value:'Fictional',confidence}]})).toThrow();
 });
});
