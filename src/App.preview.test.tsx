// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.hoisted(() => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
});
import App from './App';
import { supabase, updateDocument, getUserDocuments } from './services/supabase';

afterEach(cleanup);

it('opens the public sample without a configured database or a sign-in prompt', () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(supabase).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('unavailable on this preview');
    fireEvent.click(screen.getByRole('button', { name: 'Explore the sample' }));
    expect(screen.getByRole('region', { name: 'Synthetic output sample' }).textContent).toContain('DEMO-001');
});

it('explains unavailable sign-in without collecting credentials and supports returning home', () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getByRole('heading', { name: 'Account features unavailable' })).toBeTruthy();
    expect(screen.queryByLabelText('Email Address')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Back to Home/ }));
    expect(screen.getByRole('button', { name: 'Explore the sample' })).toBeTruthy();
});

it('rejects account data operations when the connection is unavailable', async () => {
    await expect(updateDocument('synthetic-doc', [])).rejects.toThrow('unavailable');
    await expect(getUserDocuments('synthetic-owner')).rejects.toThrow('unavailable');
});
