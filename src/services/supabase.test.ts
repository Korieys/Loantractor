import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
    getUser: vi.fn(), from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: mock.getUser }, from: mock.from }) }));
vi.mock('./logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
import { updateDocument } from './supabase';
beforeEach(() => {
    vi.resetAllMocks();
    for (const name of ['from', 'update', 'eq', 'select'] as const) mock[name].mockReturnValue(mock);
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
});
