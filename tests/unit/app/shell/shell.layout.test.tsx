import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Component } from '../../../../src/app/shell/shell.layout';
import { renderShell } from './harness';

const mocks = vi.hoisted(() => ({
  session: { phase: 'signed-out' } as Record<string, unknown>,
  signOut: vi.fn(),
}));

vi.mock('../../../../src/app/session/session', () => ({
  useSession: () => ({ ...mocks.session, signOut: mocks.signOut }),
}));

const SARI = {
  id: 'bfb15801-2dac-4f8d-ba18-5cc05c96f890',
  role: 'planter',
  displayName: 'Sari',
  walletAddress: '0x4b9e1234567890abcdef1234567890abcdef9d0e',
  email: 'sari@example.org',
  isBuyer: false,
  carbonRightsAgreementAccepted: false,
};

const signIn = (profile = SARI) => {
  mocks.session = { phase: 'ready', profile };
};

const renderLayout = (path: string) =>
  renderShell(
    <Routes>
      <Route element={<Component />}>
        <Route
          path="*"
          element={
            <main id="main-content" tabIndex={-1}>
              Page
            </main>
          }
        />
      </Route>
    </Routes>,
    path,
  );

const sidebar = () => screen.queryByRole('complementary', { name: /workspace$/ });
const app = (container: HTMLElement) => container.querySelector('.app') as HTMLElement;

beforeEach(() => {
  mocks.session = { phase: 'signed-out' };
  mocks.signOut.mockReset().mockResolvedValue(undefined);
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  MotionGlobalConfig.skipAnimations = true;
});
afterEach(() => {
  localStorage.clear();
  MotionGlobalConfig.skipAnimations = false;
});

describe('shell layout', () => {
  it.each(['signed-out', 'resolving', 'error'])(
    'phase %s: signed-out chrome, no sidebar, the page and the footer (SH-1, SH-2)',
    (phase) => {
      mocks.session = { phase };

      const { container } = renderLayout('/carbon');

      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Carbon credits' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(sidebar()).toBeNull();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByText('© 2026 Treecord')).toBeInTheDocument();
      expect(app(container)).not.toHaveClass('signed-in');
    },
  );

  it('signed in: account menu, no page navigation, the role sidebar (SH-3, SH-AC2)', () => {
    signIn();

    const { container } = renderLayout('/campaigns');

    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
    expect(screen.getByLabelText('Account: Sari, Planter')).toBeInTheDocument();
    expect(sidebar()).toHaveAccessibleName('Planter workspace');
    expect(app(container)).toHaveClass('signed-in');
  });

  it('has no sidebar on the Record evidence page but keeps the header (SH-23)', () => {
    signIn();
    renderLayout('/app/planter/record');

    expect(sidebar()).toBeNull();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('puts motion-paused on .app when motion is paused and takes it off again (SH-20)', async () => {
    const user = userEvent.setup();
    const { container } = renderLayout('/campaigns');

    expect(app(container)).not.toHaveClass('motion-paused');

    await user.click(screen.getByRole('button', { name: 'Pause motion' }));
    expect(app(container)).toHaveClass('motion-paused');

    await user.click(screen.getByRole('button', { name: 'Play motion' }));
    expect(app(container)).not.toHaveClass('motion-paused');
  });

  it('"Skip to content" focuses the page main (SH-AC3)', async () => {
    renderLayout('/campaigns');
    await userEvent.setup().click(screen.getByRole('link', { name: 'Skip to content' }));

    expect(document.activeElement?.id).toBe('main-content');
  });

  it('sign out from a private page: leave for /campaigns, drop the session, then say so (SH-AC19)', async () => {
    signIn();
    renderLayout('/app/planter/trees');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/campaigns');
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it('sign out on a public page: the page stays (SH-AC20)', async () => {
    signIn({ ...SARI, role: 'donor' } as typeof SARI);
    renderLayout('/carbon');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => expect(screen.getByText('Signed out')).toBeInTheDocument());
    expect(screen.getByTestId('where')).toHaveTextContent('/carbon');
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });
});
