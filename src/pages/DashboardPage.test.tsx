// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';
const mocks=vi.hoisted(()=>({session:vi.fn(),upload:vi.fn(),extract:vi.fn()}));
vi.mock('../services/supabase',()=>({supabase:{auth:{getSession:mocks.session}},uploadDocument:mocks.upload}));
vi.mock('../services/openai',()=>({extractLoanData:mocks.extract}));
vi.mock('../components/features/FileUploader',()=>({FileUploader:({onFileUpload}:{onFileUpload:(files:File[])=>void})=>
    <button onClick={()=>onFileUpload([new File(['%PDF-1.7'],'fictional.pdf',{type:'application/pdf'})])}>Select fictional document</button>}));
vi.mock('../components/features/DocTypeSelector',()=>({DocTypeSelector:({onSelect}:{onSelect:(type:string)=>void})=>
    <button onClick={()=>onSelect('Other')}>Extract fictional document</button>}));
beforeEach(()=>{
    mocks.session.mockResolvedValue({data:{session:{user:{id:'fictional-user'}}}});
    mocks.extract.mockResolvedValue([{field:'Amount',value:'20',confidence:0.5}]);
    vi.stubGlobal('URL',class extends URL {static createObjectURL=vi.fn(()=> 'blob:fictional');static revokeObjectURL=vi.fn();});
    vi.spyOn(window,'alert').mockImplementation(()=>{});
    vi.spyOn(console,'error').mockImplementation(()=>{});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.resetAllMocks();vi.unstubAllGlobals();});
async function edit(){
    render(<DashboardPage/>);
    fireEvent.click(screen.getByText('Select fictional document'));
    fireEvent.click(await screen.findByText('Extract fictional document'));
    fireEvent.change(await screen.findByLabelText('Amount'),{target:{value:'42'}});
}
it('retains corrected fields after a failed upload and saves those exact edits on retry',async()=>{
    mocks.upload.mockRejectedValueOnce(new Error('Temporary failure')).mockResolvedValueOnce({success:true});
    await edit();fireEvent.click(screen.getByRole('button',{name:/^Save$/}));
    await screen.findByRole('alert');
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('42');
    fireEvent.click(screen.getByRole('button',{name:/^Save$/}));
    await waitFor(()=>expect(mocks.upload).toHaveBeenCalledTimes(2));
    expect(mocks.upload.mock.calls[1][2]).toEqual([{field:'Amount',value:'42',confidence:0.5}]);
    await screen.findByText('Select fictional document');
});
it('explains an expired save session without discarding edits or reporting success',async()=>{
    mocks.session.mockResolvedValue({data:{session:null}});
    await edit();fireEvent.click(screen.getByRole('button',{name:/^Save$/}));
    expect((await screen.findByRole('alert')).textContent).toContain('sign in again');
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('42');
    expect(mocks.upload).not.toHaveBeenCalled();expect(window.alert).not.toHaveBeenCalled();
});
