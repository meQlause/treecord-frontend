import { screen } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Component as AppHome } from '../../../src/app/app-home.page';
import { SARI, apiMock, renderRoutes, resetPrivy, signedInAs } from '../session-mocks';

vi.mock('@privy-io/react-auth', async () => (await import('../session-mocks')).privyModule);
vi.mock('../../../src/app/session/api', async () => (await import('../session-mocks')).apiModule);
vi.mock(
  '../../../src/app/session/config',
  async () => (await import('../session-mocks')).configModule,
);

const Stop = () => <p>landed</p>;

describe('app-home (SH-6)', () => {
  beforeEach(() => {
    resetPrivy();
    apiMock.mockReset();
  });

  it.each([
    ['donor', '/app/donor'],
    ['planter', '/app/planter/trees'],
    ['auditor', '/app/audit'],
    ['operator', '/campaigns'],
  ])('SH-AC10: %s: /app is replaced by %s without growing the history', async (role, home) => {
    apiMock.mockResolvedValue({ profile: { ...SARI, role } });
    signedInAs();
    const routes: RouteObject[] = [
      { path: '/app', Component: AppHome },
      { path: '/app/donor', Component: Stop },
      { path: '/app/planter/trees', Component: Stop },
      { path: '/app/audit', Component: Stop },
      { path: '/campaigns', Component: Stop },
    ];
    const { router } = renderRoutes(routes, '/app');

    await screen.findByText('landed');

    expect(router.state.location.pathname).toBe(home);
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('shows "Your workspace" and the lower-case link until the replace lands', async () => {
    apiMock.mockResolvedValue({ profile: SARI });
    signedInAs();
    const routes: RouteObject[] = [{ path: '/app', Component: AppHome }];

    renderRoutes(routes, '/app');

    expect(await screen.findByRole('heading', { name: 'Your workspace' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open planter workspace' })).toHaveAttribute(
      'href',
      '/app/planter/trees',
    );
  });
});
