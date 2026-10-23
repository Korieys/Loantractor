// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LandingPage } from './LandingPage';

afterEach(cleanup);

it('opens a clearly fictional output sample without requiring login', () => {
    const onLogin = vi.fn();
    render(<LandingPage onLogin={onLogin} />);
    const button = screen.getByRole('button', { name: 'View Output Sample' });
    fireEvent.click(button);
    expect(screen.getByRole('region', { name: 'Synthetic output sample' }).textContent).toContain('DEMO-001');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(onLogin).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(screen.queryByRole('region', { name: 'Synthetic output sample' })).toBeNull();
});
