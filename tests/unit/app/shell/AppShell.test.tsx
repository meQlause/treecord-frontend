import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../../../../src/app/shell/AppShell';
import { renderShell } from './harness';

beforeEach(() => {
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const sidebar = () => screen.queryByRole('complementary', { name: /workspace$/ });

describe('AppShell', () => {
  it('signed out: no sidebar, the plain layout, the footer (SH-1)', () => {
    const { container } = renderShell(<AppShell accountRole={null} pathname="/carbon" />);

    expect(sidebar()).toBeNull();
    expect(container.querySelector('.app-plain')).not.toBeNull();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('signed in: the role sidebar beside the page (SH-3)', () => {
    const { container } = renderShell(<AppShell accountRole="planter" pathname="/campaigns" />);

    expect(sidebar()).toHaveAccessibleName('Planter workspace');
    expect(container.querySelector('.app-shell')).not.toBeNull();
  });

  it('hides the sidebar in the Record evidence focus view only (SH-23, SH-AC9)', () => {
    const { unmount } = renderShell(
      <AppShell accountRole="planter" pathname="/app/planter/record" />,
      '/app/planter/record?tree=3001&kind=ALIVE',
    );

    expect(sidebar()).toBeNull();
    unmount();

    renderShell(<AppShell accountRole="planter" pathname="/app/planter/trees" />);
    expect(sidebar()).not.toBeNull();
  });
});
