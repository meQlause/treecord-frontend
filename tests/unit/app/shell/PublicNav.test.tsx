import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PublicNav } from '../../../../src/app/shell/PublicNav';
import { renderShell } from './harness';

const link = (name: string) => screen.getByRole('link', { name });

describe('PublicNav', () => {
  it('marks Campaigns as the current page on /campaigns', () => {
    renderShell(<PublicNav />, '/campaigns');

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(link('Campaigns')).toHaveAttribute('aria-current', 'page');
    expect(link('Campaigns')).toHaveClass('nav-active');
    expect(link('Carbon credits')).not.toHaveAttribute('aria-current');
  });

  it('marks Carbon credits on /carbon (SH-AC1)', () => {
    renderShell(<PublicNav />, '/carbon');

    expect(link('Carbon credits')).toHaveAttribute('aria-current', 'page');
    expect(link('Campaigns')).not.toHaveAttribute('aria-current');
    expect(link('Campaigns')).not.toHaveClass('nav-active');
  });

  it('keeps the highlight on the section a deeper page belongs to, without aria-current', () => {
    renderShell(<PublicNav />, '/carbon/retirements/7');

    expect(link('Carbon credits')).toHaveClass('nav-active');
    expect(link('Carbon credits')).not.toHaveAttribute('aria-current');
  });

  it('highlights Campaigns on a campaign page, and nothing on a workspace page', () => {
    const { unmount } = renderShell(<PublicNav />, '/campaigns/0xabc/report');

    expect(link('Campaigns')).toHaveClass('nav-active');
    expect(link('Campaigns')).not.toHaveAttribute('aria-current');
    unmount();

    renderShell(<PublicNav />, '/sign-in');
    expect(link('Campaigns')).not.toHaveClass('nav-active');
    expect(link('Carbon credits')).not.toHaveClass('nav-active');
  });
});
