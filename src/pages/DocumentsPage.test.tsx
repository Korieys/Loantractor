// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocumentsPage } from './DocumentsPage';

const mocks = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn() }));
vi.mock('../services/supabase', () => ({
    supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: 'test-user' } } } }) } },
    getUserDocuments: mocks.list,
    getSignedUrl: async () => 'https://example.test/sample.pdf',
    deleteDocument: vi.fn(),
    updateDocument: mocks.save,
}));
vi.mock('../components/features/ExtractionViewer', () => ({
    ExtractionViewer: ({ onSave, isSaving }: { onSave: (data: unknown[]) => void, isSaving: boolean }) =>
        <button disabled={isSaving} onClick={() => onSave([{ field: 'Total', value: '42', confidence: 1 }])}>Save correction</button>,
}));
const docs = [
    { id: 'one', file_path: 'test-user/income.pdf', doc_type: 'Pay Stub', created_at: '2026-01-01', extracted_data: [] },
    { id: 'two', file_path: 'test-user/tax.pdf', doc_type: 'Tax Return', created_at: '2026-01-02', extracted_data: [] },
];
afterEach(() => { cleanup(); vi.resetAllMocks(); });
async function open() {
    mocks.list.mockResolvedValue(docs);
    render(<MemoryRouter><DocumentsPage /></MemoryRouter>);
    await screen.findByText('income.pdf');
}
describe('customer document workflow', () => {
    it('combines search and type filters and explains no matches', async () => {
        await open();
        fireEvent.change(screen.getByLabelText('Search documents'), { target: { value: 'INCOME' } });
        expect(screen.queryByText('tax.pdf')).toBeNull();
        fireEvent.change(screen.getByLabelText('Filter by document type'), { target: { value: 'Tax Return' } });
        expect(screen.getAllByText('No documents match your search or filter.')).toHaveLength(2);
    });
    it('keeps corrections open after failure and closes only after a confirmed save', async () => {
        await open();
        mocks.save.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
        fireEvent.click(screen.getAllByTitle('View Document')[0]);
        fireEvent.click(await screen.findByText('Save correction'));
        await screen.findByRole('alert');
        expect(screen.getByText('Save correction')).toBeTruthy();
        fireEvent.click(screen.getByText('Save correction'));
        await waitFor(() => expect(screen.queryByText('Save correction')).toBeNull());
        expect(mocks.save).toHaveBeenCalledWith('one', [{ field: 'Total', value: '42', confidence: 1 }]);
    });
    it('gives each document labelled review and delete actions in the phone layout', async () => {
        await open();
        const phoneList = within(screen.getByRole('list', { name: 'Saved documents' }));
        expect(phoneList.getAllByRole('listitem')).toHaveLength(2);
        expect(phoneList.getByRole('button', { name: /^Delete Tax Return from/ })).toBeTruthy();
        fireEvent.click(phoneList.getByRole('button', { name: /^Review Pay Stub from/ }));
        expect(await screen.findByText('Save correction')).toBeTruthy();
    });
    it('shows a retry instead of an empty library after a load failure', async () => {
        mocks.list.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(docs);
        render(<MemoryRouter><DocumentsPage /></MemoryRouter>);
        fireEvent.click(await screen.findByText('Retry'));
        await screen.findByText('income.pdf');
        expect(screen.queryByRole('alert')).toBeNull();
    });
});
