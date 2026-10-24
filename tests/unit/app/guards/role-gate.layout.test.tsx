import { screen } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Component as RequireSession } from '../../../../src/app/guards/require-session.layout';
import { Component as RoleGate } from '../../../../src/app/guards/role-gate.layout';
import type { Role, RouteHandle } from '../../../../src/app/route-handle';
import { SARI, apiMock, renderRoutes, resetPrivy, signedInAs } from '../../session-mocks';

vi.mock('@privy-io/react-auth', async () => (await import('../../session-mocks')).privyModule);
vi.mock(
  '../../../../src/app/session/api',
  async () => (await import('../../session-mocks')).apiModule,
);
vi.mock(
  '../../../../src/app/session/config',
  async () => (await import('../../session-mocks')).configModule,
);

const mounted = vi.fn();

function Page() {
  mounted();

  return <p>gated page</p>;
}

const gated = (roles: readonly Role[], path: string): RouteObject => ({
  Component: RoleGate,
  handle: { roles } satisfies RouteHandle,
  children: [{ path, Component: Page }],
});

const routes: RouteObject[] = [
  {
    path: '/app',
    Component: RequireSession,
    children: [
      gated(['planter'], 'planter/trees'),
      gated(['operator'], 'operator/campaigns/:address'),
      gated(['auditor'], 'audit'),
      gated(['donor', 'operator'], 'donor'),
      gated(['donor', 'operator'], 'campaigns/new'),
      { path: 'profile', Component: Page },
    ],
  },
];

const signInAs = (role: string) => {
  apiMock.mockResolvedValue({ profile: { ...SARI, role } });
  signedInAs();
};

describe('RoleGate', () => {
  beforeEach(() => {
    resetPrivy();
    mounted.mockClear();
    apiMock.mockReset();
  });

  it('SH-AC15: another role sees "Role unavailable" and the page is never mounted, so it sends no request', async () => {
    signInAs('donor');
    renderRoutes(routes, '/app/operator/campaigns/0x0000000000000000000000000000000000000003');

    expect(await screen.findByText('Role unavailable')).toBeInTheDocument();
    expect(screen.getByText('This screen is for Operator accounts.')).toBeInTheDocument();
    expect(mounted).not.toHaveBeenCalled();
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(apiMock).toHaveBeenCalledWith('/me', expect.anything());
  });

  it.each([
    ['donor', '/app/planter/trees', 'Planter'],
    ['planter', '/app/audit', 'Auditor'],
    ['auditor', '/app/donor', 'Donor'],
  ])('%s at %s: "This screen is for %s accounts."', async (role, path, label) => {
    signInAs(role);
    renderRoutes(routes, path);

    expect(await screen.findByText(`This screen is for ${label} accounts.`)).toBeInTheDocument();
    expect(mounted).not.toHaveBeenCalled();
  });

  it('SH-12: the screen for two roles shows the COPY-104 placeholder', async () => {
    signInAs('planter');
    const { container } = renderRoutes(routes, '/app/campaigns/new');

    expect(await screen.findByText('Role unavailable')).toBeInTheDocument();
    expect(container.querySelector('[data-copy="COPY-104"]')).not.toBeNull();
    expect(mounted).not.toHaveBeenCalled();
  });

  it.each([
    ['planter', '/app/planter/trees'],
    ['donor', '/app/donor'],
    ['operator', '/app/donor'],
    ['operator', '/app/campaigns/new'],
    ['auditor', '/app/audit'],
  ])('%s may open %s', async (role, path) => {
    signInAs(role);
    renderRoutes(routes, path);

    expect(await screen.findByText('gated page')).toBeInTheDocument();
  });

  it('a route with no roles is open to any signed-in account', async () => {
    signInAs('auditor');
    renderRoutes(routes, '/app/profile');

    expect(await screen.findByText('gated page')).toBeInTheDocument();
  });
});
