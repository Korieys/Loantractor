import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.example.com');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'synthetic-test-key');
    return {
        getUser: vi.fn(), from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(), insert: vi.fn(), storageFrom: vi.fn(), upload: vi.fn(),
    };
});
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: mock.getUser }, from: mock.from, storage:{from:mock.storageFrom} }) }));
vi.mock('./logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
import { updateDocument, uploadDocument } from './supabase';
beforeEach(() => {
    vi.resetAllMocks();
    for (const name of ['from', 'update', 'eq', 'select', 'insert', 'storageFrom'] as const) mock[name].mockReturnValue(mock);
    mock.upload.mockResolvedValue({data:{},error:null});
    mock.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
});
describe('document correction persistence', () => {
    it('scopes the update to the authenticated owner and requires a returned record', async () => {
        mock.single.mockResolvedValue({ data: { id: 'doc' }, error: null });
        await updateDocument('doc', [{ field: 'Total', value: '42' }]);
        expect(mock.eq.mock.calls).toEqual([['id', 'doc'], ['user_id', 'owner']]);
        expect(mock.update).toHaveBeenCalledWith({ extracted_data: [{ field: 'Total', value: '42' }] });
    });
    it('does not write after an expired sign-in', async () => {
        mock.getUser.mockResolvedValue({ data: { user: null }, error: null });
        await expect(updateDocument('doc', [])).rejects.toThrow('sign in');
        expect(mock.from).not.toHaveBeenCalled();
    });
    it('does not report success when no matching record was updated', async () => {
        mock.single.mockResolvedValue({ data: null, error: null });
        await expect(updateDocument('doc', [])).rejects.toThrow('could not be saved');
    });
    it('saves a corrected document type with fields on the existing owner record',async()=>{
        mock.single.mockResolvedValue({data:{id:'doc'},error:null});
        await updateDocument('doc',[],'Tax Return');
        expect(mock.update).toHaveBeenCalledWith({extracted_data:[],doc_type:'Tax Return'});
        expect(mock.eq.mock.calls).toEqual([['id','doc'],['user_id','owner']]);
    });
    it('returns the database-assigned identity for subsequent review instead of creating a new record',async()=>{
        mock.single.mockResolvedValue({data:{id:'saved-document'},error:null});
        const file=new File(['%PDF-1.7'],'fictional.pdf',{type:'application/pdf'});
        await expect(uploadDocument(file,'Other',[],'owner')).resolves.toEqual({success:true,id:'saved-document'});
        expect(mock.select).toHaveBeenCalledWith('id');
        expect(mock.insert.mock.calls[0][0]).toMatchObject({user_id:'owner',file_path:expect.stringMatching(/^owner\/[a-f0-9-]{36}\.pdf$/)});
    });
    it('does not upload into a stale account when the authenticated user changes',async()=>{
        mock.getUser.mockResolvedValue({data:{user:{id:'other-owner'}},error:null});
        await expect(uploadDocument(new File(['fictional'],'sample.pdf'),'Other',[],'owner')).rejects.toThrow('sign in');
        expect(mock.storageFrom).not.toHaveBeenCalled();expect(mock.insert).not.toHaveBeenCalled();
    });
    it('requires a confirmed metadata record before reporting the upload saved',async()=>{
        mock.single.mockResolvedValue({data:null,error:null});
        await expect(uploadDocument(new File(['fictional'],'sample.pdf'),'Other',[],'owner')).rejects.toThrow('could not be confirmed');
    });
});
