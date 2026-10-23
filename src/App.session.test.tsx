// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const auth = vi.hoisted(() => ({ getSession: vi.fn(), unsubscribe: vi.fn() }));
vi.mock('./services/supabase', async importOriginal => ({
    ...await importOriginal<typeof import('./services/supabase')>(),
    supabase: { auth: {
        getSession: auth.getSession,
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: auth.unsubscribe } } }),
    } },
}));
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
