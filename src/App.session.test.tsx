// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
const auth = vi.hoisted(() => ({ getSession: vi.fn(), unsubscribe: vi.fn(), listener: null as null | ((event:string,session:unknown)=>void) }));
vi.mock('./services/supabase', async importOriginal => ({
    ...await importOriginal<typeof import('./services/supabase')>(),
    supabase: { auth: {
        getSession: auth.getSession,
        onAuthStateChange: (listener:typeof auth.listener) => {auth.listener=listener;return { data: { subscription: { unsubscribe: auth.unsubscribe } } };},
    } },
}));
vi.mock('./layouts/DashboardLayout',()=>({DashboardLayout:({children}:{children:ReactNode})=><section><input aria-label="Account workspace draft"/>{children}</section>}));
import App from './App';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('keeps configured sign-in available for visitors without a session', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    render(<MemoryRouter><App /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Start Extraction' }));
    expect(screen.getByLabelText('Email Address')).toBeTruthy();
    expect(screen.queryByText(/unavailable on this preview/)).toBeNull();
});

it('leaves the loading screen and explains a failed session restore', async () => {
    auth.getSession.mockRejectedValue(new Error('Synthetic offline failure'));
    const view = render(<MemoryRouter><App /></MemoryRouter>);
    expect((await screen.findByRole('alert')).textContent).toContain('Please sign in again');
    expect(screen.getByRole('button', { name: 'View Output Sample' })).toBeTruthy();
    view.unmount();
    expect(auth.unsubscribe).toHaveBeenCalledOnce();
});

it('resets the account workspace when the authenticated user changes',async()=>{
    auth.getSession.mockResolvedValue({data:{session:{user:{id:'fictional-first'}}},error:null});
    render(<MemoryRouter><App/></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('Account workspace draft'),{target:{value:'First account work'}});
    await act(async()=>auth.listener?.('SIGNED_IN',{user:{id:'fictional-second'}}));
    expect((screen.getByLabelText('Account workspace draft') as HTMLInputElement).value).toBe('');
});

it('does not restore an old account after a newer sign-out event',async()=>{
    let resolveRestore!:(value:unknown)=>void;
    auth.getSession.mockImplementationOnce(()=>new Promise(resolve=>{resolveRestore=resolve;}));
    render(<MemoryRouter><App/></MemoryRouter>);
    await act(async()=>auth.listener?.('SIGNED_OUT',null));
    await act(async()=>resolveRestore({data:{session:{user:{id:'fictional-old'}}},error:null}));
    expect(screen.getByRole('button',{name:'View Output Sample'})).toBeTruthy();
    expect(screen.queryByLabelText('Account workspace draft')).toBeNull();
});
