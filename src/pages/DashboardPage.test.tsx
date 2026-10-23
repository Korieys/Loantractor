// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';
const mocks=vi.hoisted(()=>({session:vi.fn(),upload:vi.fn(),extract:vi.fn(),update:vi.fn()}));
vi.mock('../services/supabase',()=>({supabase:{auth:{getSession:mocks.session}},uploadDocument:mocks.upload,updateDocument:mocks.update}));
vi.mock('../services/openai',()=>({extractLoanData:mocks.extract}));
vi.mock('../components/features/FileUploader',()=>({FileUploader:({onFileUpload}:{onFileUpload:(files:File[])=>void})=>
    <><button onClick={()=>onFileUpload([new File(['%PDF-1.7'],'fictional.pdf',{type:'application/pdf'})])}>Select fictional document</button>
    <button onClick={()=>onFileUpload(['first.pdf','second.pdf'].map(name=>new File(['%PDF-1.7'],name,{type:'application/pdf'})))}>Select fictional batch</button></>}));
vi.mock('../components/features/DocTypeSelector',()=>({DocTypeSelector:({onSelect}:{onSelect:(type:string)=>void})=>
    <button onClick={()=>onSelect('Other')}>Extract fictional document</button>}));
beforeEach(()=>{
    mocks.session.mockResolvedValue({data:{session:{user:{id:'fictional-user'}}}});
    mocks.extract.mockResolvedValue([{field:'Amount',value:'20',confidence:0.5}]);
    mocks.upload.mockImplementation(async(file:File)=>({success:true,id:`saved-${file.name}`}));
    mocks.update.mockResolvedValue(undefined);
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

async function batch(){
    const view=render(<DashboardPage/>);
    fireEvent.click(screen.getByText('Select fictional batch'));
    for(const name of ['first.pdf','second.pdf'])fireEvent.change(await screen.findByLabelText(`Document type for ${name}`),{target:{value:'Other'}});
    fireEvent.click(screen.getByRole('button',{name:'Process All Files'}));
    return view;
}
it('retries only a failed extraction and leaves completed documents untouched',async()=>{
    mocks.extract.mockRejectedValueOnce(new Error('Temporary extraction failure')).mockResolvedValue([{field:'Amount',value:'20',confidence:0.5}]);
    await batch();fireEvent.click(await screen.findByRole('button',{name:'Retry first.pdf'}));
    await screen.findByRole('button',{name:'Review first.pdf'});
    expect(mocks.extract.mock.calls.map(call=>call[0].name)).toEqual(['first.pdf','second.pdf','first.pdf']);
    expect(mocks.upload.mock.calls.map(call=>call[0].name)).toEqual(['second.pdf','first.pdf']);
    expect(screen.queryByText(/Processing finished with failed/)).toBeNull();
});
it('reuses extracted fields after a failed save instead of invoking the provider again',async()=>{
    mocks.upload.mockRejectedValueOnce(new Error('Storage unavailable'));
    await batch();fireEvent.click(await screen.findByRole('button',{name:'Retry first.pdf'}));
    await screen.findByRole('button',{name:'Review first.pdf'});
    expect(mocks.extract).toHaveBeenCalledTimes(2);expect(mocks.upload).toHaveBeenCalledTimes(3);
});
it('invalidates cached extraction when a failed document is assigned a different type',async()=>{
    mocks.upload.mockRejectedValueOnce(new Error('Storage unavailable'));
    await batch();await screen.findByRole('button',{name:'Retry first.pdf'});
    fireEvent.change(screen.getByLabelText('Document type for first.pdf'),{target:{value:'Tax Return'}});
    fireEvent.click(screen.getByRole('button',{name:'Retry first.pdf'}));
    await screen.findByRole('button',{name:'Review first.pdf'});
    expect(mocks.extract).toHaveBeenCalledTimes(3);expect(mocks.extract.mock.calls[2][1]).toBe('Tax Return');
});
it('saves batch corrections to the original document and retains the remaining queue',async()=>{
    await batch();fireEvent.click(await screen.findByRole('button',{name:'Review first.pdf'}));
    fireEvent.change(await screen.findByLabelText('Amount'),{target:{value:'84'}});
    fireEvent.click(screen.getByRole('button',{name:/^Save$/}));
    await screen.findByRole('button',{name:'Review second.pdf'});
    expect(mocks.update).toHaveBeenCalledWith('saved-first.pdf',[{field:'Amount',value:'84',confidence:0.5}],'Other');
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button',{name:'Review first.pdf'}));
    expect((await screen.findByLabelText('Amount') as HTMLInputElement).value).toBe('84');
});
it('keeps batch edits open on update failure and retries the same saved record',async()=>{
    mocks.update.mockRejectedValueOnce(new Error('Temporary save failure')).mockResolvedValue(undefined);
    await batch();fireEvent.click(await screen.findByRole('button',{name:'Review first.pdf'}));
    fireEvent.change(await screen.findByLabelText('Amount'),{target:{value:'84'}});
    fireEvent.click(screen.getByRole('button',{name:/^Save$/}));await screen.findByRole('alert');
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('84');
    fireEvent.click(screen.getByRole('button',{name:/^Save$/}));await screen.findByRole('button',{name:'Review first.pdf'});
    expect(mocks.update.mock.calls.map(call=>call[0])).toEqual(['saved-first.pdf','saved-first.pdf']);
    expect(mocks.upload).toHaveBeenCalledTimes(2);
});
it('does not start saving or the next extraction after leaving an in-progress batch',async()=>{
    let resolveExtraction!:(data:{field:string,value:string,confidence:number}[])=>void;
    mocks.extract.mockImplementationOnce(()=>new Promise(resolve=>{resolveExtraction=resolve;}));
    const view=await batch();await waitFor(()=>expect(mocks.extract).toHaveBeenCalledOnce());view.unmount();
    await act(async()=>resolveExtraction([{field:'Amount',value:'20',confidence:0.5}]));
    expect(mocks.extract).toHaveBeenCalledOnce();
    expect(mocks.upload).not.toHaveBeenCalled();
});
