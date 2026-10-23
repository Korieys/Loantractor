// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({getSession:vi.fn()}));
vi.mock('./supabase',()=>({supabase:{auth:{getSession:mocks.getSession}},ACCOUNT_UNAVAILABLE:'Preview unavailable'}));
import {extractLoanData,checkExtractionFile,MAX_FILE_BYTES} from './openai';
const file=()=>new File(['%PDF-1.7\nSynthetic test only'],'fictional.pdf',{type:'application/pdf'});
beforeEach(()=>{mocks.getSession.mockResolvedValue({data:{session:{access_token:'fictional-session-token'}},error:null});});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

it('requires a session before reading or transmitting the document',async()=>{
 mocks.getSession.mockResolvedValue({data:{session:null},error:null});
 const read=vi.spyOn(FileReader.prototype,'readAsDataURL'),fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
 await expect(extractLoanData(file())).rejects.toThrow('sign in again');
 expect(read).not.toHaveBeenCalled();expect(fetchMock).not.toHaveBeenCalled();
});
it('sends the session and PDF data using the fixed extraction contract',async()=>{
 const fields=[{field:'Amount',value:'Not Found',confidence:0}],fetchMock=vi.fn(async()=>new Response(JSON.stringify({data:fields}),{status:200}));vi.stubGlobal('fetch',fetchMock);
 await expect(extractLoanData(file(),'Loan Application')).resolves.toEqual(fields);
 const [url,options]=fetchMock.mock.calls[0] as unknown as [string,RequestInit];
 expect(url).toBe('/api/openai');expect(new Headers(options.headers).get('Authorization')).toBe('Bearer fictional-session-token');
 const body=JSON.parse(options.body as string);expect(Object.keys(body).sort()).toEqual(['dataUrl','docType']);
 expect(body.docType).toBe('Loan Application');expect(body.dataUrl).toMatch(/^data:application\/pdf;base64,/);
});
it('never substitutes sample fields for API failure or an empty extraction',async()=>{
 for(const [status,body] of [[404,{error:'Document processing unavailable'}],[200,{data:[]}]] as const){
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(body),{status})));
  await expect(extractLoanData(file())).rejects.toThrow();
 }
});
it('rejects empty, oversized and unsupported documents locally',()=>{
 expect(()=>checkExtractionFile(new File([],'empty.pdf',{type:'application/pdf'}))).toThrow('2 MB');
 expect(()=>checkExtractionFile(new File([new Uint8Array(MAX_FILE_BYTES+1)],'big.pdf',{type:'application/pdf'}))).toThrow('2 MB');
 expect(()=>checkExtractionFile(new File(['<svg/>'],'vector.svg',{type:'image/svg+xml'}))).toThrow('PDF, PNG, JPG or WebP');
});
