import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleSidebar } from '../../../../src/app/shell/RoleSidebar';
import { renderShell } from './harness';

const scrollIntoView = vi.fn();

beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
});
afterEach(() => scrollIntoView.mockClear());

describe('RoleSidebar', () => {
  it('is the "Planter workspace" with its five items and the current one marked (SH-AC2)', () => {
    renderShell(<RoleSidebar accountRole="planter" pathname="/campaigns" />);

    expect(screen.getByRole('complementary', { name: 'Planter workspace' })).toBeInTheDocument();
    expect(screen.getByText('PLANTER WORKSPACE')).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: 'Planter navigation' });

    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['My trees', 'Slots', 'Campaigns', 'Challenges', 'Uploads']);
    expect(within(nav).getByRole('link', { name: 'Campaigns' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getAllByRole('link', { current: 'page' })).toHaveLength(1);
    expect(nav.querySelectorAll('.sidebar-active-dot')).toHaveLength(1);
  });

  it('keeps Campaigns current on a campaign report for a Donor (SH-AC8)', () => {
    renderShell(
      <RoleSidebar
        accountRole="donor"
        pathname="/campaigns/0x0000000000000000000000000000000000000003/report"
      />,
    );

    expect(screen.getByRole('link', { name: 'Campaigns' })).toHaveAttribute('aria-current', 'page');
  });

  it('labels the other roles', () => {
    const { unmount } = renderShell(<RoleSidebar accountRole="auditor" pathname="/app/audit" />);

    expect(screen.getByText('AUDITOR WORKSPACE')).toBeInTheDocument();
    unmount();

    renderShell(<RoleSidebar accountRole="operator" pathname="/campaigns" />);
    expect(screen.getByRole('navigation', { name: 'Operator navigation' })).toBeInTheDocument();
  });

  it('brings the current tab into view when the route changes (SH-AC27)', () => {
    renderShell(<RoleSidebar accountRole="planter" pathname="/app/planter/uploads" />);

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'center' });
  });

  it('carries the growth art with the words "Every tree, proven."', () => {
    renderShell(<RoleSidebar accountRole="donor" pathname="/app/donor" />);

    expect(document.querySelector('.ga-text')).toHaveTextContent(/Every tree,\s*proven\./);
  });
});
