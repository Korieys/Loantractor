import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.example.com');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'synthetic-test-key');
    return {
        getUser: vi.fn(), from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(), insert: vi.fn(), storageFrom: vi.fn(), upload: vi.fn(), remove: vi.fn(), delete: vi.fn(),
    };
});
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: mock.getUser }, from: mock.from, storage:{from:mock.storageFrom} }) }));
vi.mock('./logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
import { deleteDocument, SAVE_UNCONFIRMED, updateDocument, uploadDocument } from './supabase';
beforeEach(() => {
    vi.resetAllMocks();
    for (const name of ['from', 'update', 'eq', 'select', 'insert', 'storageFrom', 'delete'] as const) mock[name].mockReturnValue(mock);
    mock.upload.mockResolvedValue({data:{},error:null});
    mock.remove.mockResolvedValue({data:[],error:null});
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
describe('unconfirmed save recovery', () => {
    const file = () => new File(['%PDF-1.7'], 'Fictional Statement.PDF', { type: 'application/pdf' });
    it('stores the original under the reusable save key without overwriting', async () => {
        mock.single.mockResolvedValue({ data: { id: 'doc' }, error: null, status: 201 });
        await uploadDocument(file(), 'Other', [], 'owner', 'key-1');
        expect(mock.upload).toHaveBeenCalledWith('owner/key-1.pdf', expect.any(File), { upsert: false });
        expect(mock.insert.mock.calls[0][0]).toMatchObject({ user_id: 'owner', file_path: 'owner/key-1.pdf' });
    });
    it('continues a retry whose earlier upload already reached storage', async () => {
        mock.upload.mockResolvedValue({ data: null, error: { message: 'The resource already exists', statusCode: '409', status: 400 } });
        mock.single.mockResolvedValue({ data: { id: 'doc' }, error: null, status: 201 });
        await expect(uploadDocument(file(), 'Other', [], 'owner', 'key-1')).resolves.toEqual({ success: true, id: 'doc' });
    });
    it('confirms an earlier unacknowledged insert instead of creating a duplicate record', async () => {
        mock.single
            .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate key' }, status: 409 })
            .mockResolvedValueOnce({ data: { id: 'earlier' }, error: null, status: 200 });
        await expect(uploadDocument(file(), 'Tax Return', [{ field: 'Year', value: '2025' }], 'owner', 'key-1')).resolves.toEqual({ success: true, id: 'earlier' });
        expect(mock.insert).toHaveBeenCalledTimes(1);
        expect(mock.update).toHaveBeenCalledWith({ extracted_data: [{ field: 'Year', value: '2025' }], doc_type: 'Tax Return' });
        expect(mock.eq.mock.calls).toEqual([['file_path', 'owner/key-1.pdf'], ['user_id', 'owner']]);
        expect(mock.remove).not.toHaveBeenCalled();
    });
    it('keeps the stored file for a safe retry when the record write has no answer', async () => {
        mock.single.mockResolvedValue({ data: null, error: { message: 'TypeError: fetch failed', code: '' }, status: 0 });
        await expect(uploadDocument(file(), 'Other', [], 'owner', 'key-1')).rejects.toThrow(SAVE_UNCONFIRMED);
        expect(mock.remove).not.toHaveBeenCalled();
    });
    it('removes the stored file when the database definitively refuses the record', async () => {
        mock.single.mockResolvedValue({ data: null, error: { message: 'row-level security', code: '42501' }, status: 403 });
        await expect(uploadDocument(file(), 'Other', [], 'owner', 'key-1')).rejects.toThrow('could not be saved');
        expect(mock.remove).toHaveBeenCalledWith(['owner/key-1.pdf']);
    });
    it('treats gateway failures on the record write as unconfirmed and keeps the file', async () => {
        for (const status of [408, 502, 504]) {
            mock.single.mockResolvedValueOnce({ data: null, error: { message: 'upstream timeout', code: '' }, status });
            await expect(uploadDocument(file(), 'Other', [], 'owner', 'key-1')).rejects.toThrow(SAVE_UNCONFIRMED);
        }
        expect(mock.remove).not.toHaveBeenCalled();
    });
    it('does not write a record when the file upload has no answer', async () => {
        mock.upload.mockResolvedValue({ data: null, error: { name: 'StorageUnknownError', message: 'fetch failed' } });
        await expect(uploadDocument(file(), 'Other', [], 'owner', 'key-1')).rejects.toThrow(SAVE_UNCONFIRMED);
        expect(mock.insert).not.toHaveBeenCalled();
    });
    it('deletes only the signed-in owner record and requires a confirmed deletion', async () => {
        mock.select.mockResolvedValueOnce({ data: [{ id: 'doc' }], error: null });
        await deleteDocument('doc', 'owner/key-1.pdf');
        expect(mock.remove).toHaveBeenCalledWith(['owner/key-1.pdf']);
        expect(mock.eq.mock.calls).toEqual([['id', 'doc'], ['user_id', 'owner']]);
        mock.select.mockResolvedValueOnce({ data: [], error: null });
        await expect(deleteDocument('doc', 'owner/key-1.pdf')).rejects.toThrow('could not be deleted');
    });
});
