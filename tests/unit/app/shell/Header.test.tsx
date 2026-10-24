import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountProfile } from '../../../../src/app/shell/AccountMenu';
import { Header } from '../../../../src/app/shell/Header';
import { renderShell } from './harness';

const SARI: AccountProfile = {
  role: 'planter',
  displayName: 'Sari',
  walletAddress: null,
  email: null,
};

const scrollTo = (scrollY: number, scrollHeight: number): void => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY });
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
};

beforeEach(() => {
  // every frame runs at once, so a scroll is reflected as soon as it is dispatched
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((frame) => {
    frame(0);

    return 0;
  });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: 3000,
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  scrollTo(0, 0);
});

describe('Header', () => {
  it('signed out: brand, public navigation, network, motion toggle and "Sign in" (SH-1, SH-AC1)', () => {
    renderShell(<Header profile={null} onSignOut={vi.fn()} />, '/carbon');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Treecord home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Carbon credits' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Base Sepolia')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause motion' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Account:/)).toBeNull();
  });

  it('signed in: the account menu instead of the public navigation and "Sign in" (SH-3, SH-AC2)', () => {
    renderShell(<Header profile={SARI} onSignOut={vi.fn()} />);

    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
    expect(screen.getByLabelText('Account: Sari, Planter')).toBeInTheDocument();
  });

  it('writes --progress to four decimals without waiting for React (SH-AC26)', () => {
    renderShell(<Header profile={null} onSignOut={vi.fn()} />);

    const banner = screen.getByRole('banner');

    expect(banner.style.getPropertyValue('--progress')).toBe('0.0000');

    scrollTo(500, 3000);
    expect(banner.style.getPropertyValue('--progress')).toBe('0.2500');

    scrollTo(9999, 3000);
    expect(banner.style.getPropertyValue('--progress')).toBe('1.0000');
  });

  it('is compact past 120 px on a page with no heading, and roomy again at the top (SH-AC26)', () => {
    renderShell(<Header profile={null} onSignOut={vi.fn()} />);

    const banner = screen.getByRole('banner');

    scrollTo(121, 3000);
    expect(banner).toHaveClass('header--compact');

    scrollTo(0, 3000);
    expect(banner).not.toHaveClass('header--compact');
    expect(banner.style.getPropertyValue('--progress')).toBe('0.0000');
  });

  it('turns compact once the page heading is scrolled past, less 64 px', () => {
    renderShell(
      <>
        <Header profile={null} onSignOut={vi.fn()} />
        <section className="page-heading" />
      </>,
    );

    const heading = document.querySelector('.page-heading') as HTMLElement;

    Object.defineProperty(heading, 'offsetTop', { configurable: true, value: 100 });
    Object.defineProperty(heading, 'offsetHeight', { configurable: true, value: 500 });

    scrollTo(536, 3000);
    expect(screen.getByRole('banner')).not.toHaveClass('header--compact');

    scrollTo(537, 3000);
    expect(screen.getByRole('banner')).toHaveClass('header--compact');
  });
});
