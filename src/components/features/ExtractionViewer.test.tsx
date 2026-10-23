// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ExtractionViewer } from './ExtractionViewer';
const data = [{field:'Amount',value:'Not Found',confidence:0}];
const actions = {onSave:vi.fn(),onCancel:vi.fn()};
beforeEach(() => {vi.stubGlobal('URL',class extends URL {static createObjectURL=vi.fn(()=> 'blob:fictional-pdf');static revokeObjectURL=vi.fn();});});
afterEach(() => {cleanup();vi.unstubAllGlobals();vi.clearAllMocks();});

it('shows the local PDF with an open fallback and releases its temporary URL', () => {
    const {unmount} = render(<ExtractionViewer data={data} file={new File(['%PDF-1.7'],'fictional.pdf',{type:'application/pdf'})} {...actions} />);
    expect(screen.getByLabelText('fictional.pdf PDF preview').getAttribute('data')).toBe('blob:fictional-pdf');
    expect(screen.getByRole('link',{name:'Open PDF in a new tab'}).getAttribute('href')).toBe('blob:fictional-pdf');
    expect(screen.getByText('0% AI confidence')).toBeTruthy();
    unmount();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fictional-pdf');
});
it('identifies a reopened PDF by its stored filename instead of treating every signed URL as an image', () => {
    render(<ExtractionViewer data={data} file={null} fileName="fictional.pdf" fileUrl="https://example.test/signed-file?token=fictional" {...actions} />);
    expect(screen.getByLabelText('fictional.pdf PDF preview').getAttribute('type')).toBe('application/pdf');
    expect(screen.queryByRole('img')).toBeNull();
});
it('retains edits while saving, and only replaces them when reanalysis returns new data', () => {
    const {rerender}=render(<ExtractionViewer data={data} file={null} {...actions} />);
    fireEvent.change(screen.getByLabelText('Amount'),{target:{value:'42'}});
    rerender(<ExtractionViewer data={data} file={null} isSaving {...actions} />);
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('42');
    expect((screen.getByRole('button',{name:'Saving…'}) as HTMLButtonElement).disabled).toBe(true);
    rerender(<ExtractionViewer data={[{field:'Amount',value:'84',confidence:0.8}]} file={null} {...actions} />);
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('84');
});
