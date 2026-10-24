import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RouteObject } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Component as RequireSession } from '../../../../src/app/guards/require-session.layout';
import { ApiError } from '../../../../src/shared/api/errors';
import {
  SARI,
  apiMock,
  privyState,
  renderRoutes,
  resetPrivy,
  signedInAs,
} from '../../session-mocks';

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

function PrivatePage() {
  mounted();

  return <p>private page</p>;
}

const routes: RouteObject[] = [
  { path: '/sign-in', Component: () => <p>sign in screen</p> },
  {
    path: '/app',
    Component: RequireSession,
    children: [
      { index: true, Component: PrivatePage },
      { path: 'profile', Component: PrivatePage },
    ],
  },
];

const here = (router: { state: { location: { pathname: string; search: string } } }) =>
  router.state.location.pathname + router.state.location.search;

describe('RequireSession', () => {
  beforeEach(() => {
    resetPrivy();
    mounted.mockClear();
    apiMock.mockReset();
  });

  it('SH-AC13: signed out, goes to S02 with the page asked for, before anything private renders', async () => {
    const { router } = renderRoutes(routes, '/app/profile?tab=wallet');

    await screen.findByText('sign in screen');

    expect(here(router)).toBe('/sign-in?returnTo=%2Fapp%2Fprofile%3Ftab%3Dwallet');
    expect(mounted).not.toHaveBeenCalled();
    expect(apiMock).not.toHaveBeenCalled();
    expect(screen.queryByText('private page')).toBeNull();
  });

  it('replaces the history entry rather than pushing one', async () => {
    const { router } = renderRoutes(routes, '/app/profile');

    await screen.findByText('sign in screen');

    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('SH-15: a refused token goes to S02 saying why (the session-ended banner); never signed in says nothing', async () => {
    apiMock.mockRejectedValue(new ApiError({ code: 'invalid_token', message: 'x', status: 401 }));
    signedInAs();
    const { router } = renderRoutes(routes, '/app/profile');

    await screen.findByText('sign in screen');

    expect(router.state.location.state).toEqual({ reason: 'session-expired' });
  });

  it('SH-AC13: the copy PageMotion keeps while it leaves, already on /sign-in, does not redirect again', () => {
    const { router } = renderRoutes(
      [{ path: '/sign-in', Component: RequireSession }],
      '/sign-in?returnTo=%2Fapp',
    );

    expect(here(router)).toBe('/sign-in?returnTo=%2Fapp');
    expect(router.state.historyAction).toBe('POP');
  });

  it('SH-2: Privy not ready shows the loading status and stays on the URL', () => {
    privyState.ready = false;
    const { router } = renderRoutes(routes, '/app');

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading workspace…')).toBeInTheDocument();
    expect(here(router)).toBe('/app');
    expect(mounted).not.toHaveBeenCalled();
    expect(apiMock).not.toHaveBeenCalled();
  });

  it('SH-AC11: a session waits for GET /me, and the page mounts only after it', async () => {
    let answer: (body: unknown) => void = (_body: unknown) => undefined;

    apiMock.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    signedInAs();
    renderRoutes(routes, '/app/profile');

    expect(await screen.findByText('Loading workspace…')).toBeInTheDocument();
    expect(mounted).not.toHaveBeenCalled();

    answer({ profile: SARI });

    expect(await screen.findByText('private page')).toBeInTheDocument();
    expect(apiMock).toHaveBeenCalledTimes(1);
  });

  it('SH-AC17: a failed /me shows "Could not load this page"; Try again reads /me once more and no more', async () => {
    apiMock.mockRejectedValueOnce(
      new ApiError({ code: 'service_unavailable', message: 'x', status: 503 }),
    );
    apiMock.mockResolvedValue({ profile: SARI });
    signedInAs();
    renderRoutes(routes, '/app/profile');

    expect(await screen.findByText('Could not load this page')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Your inputs and local records are unchanged.',
    );
    expect(mounted).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('private page')).toBeInTheDocument();
    expect(apiMock).toHaveBeenCalledTimes(2);
  });

  it('SH-16: 409 wallet_already_linked sends the visitor to S02 with no profile', async () => {
    apiMock.mockRejectedValue(
      new ApiError({ code: 'wallet_already_linked', message: 'x', status: 409 }),
    );
    signedInAs();
    const { router } = renderRoutes(routes, '/app/profile');

    await screen.findByText('sign in screen');

    expect(here(router)).toBe('/sign-in?returnTo=%2Fapp%2Fprofile');
    expect(mounted).not.toHaveBeenCalled();
  });

  it('SH-3: a ready session renders the page inside the workspace main', async () => {
    apiMock.mockResolvedValue({ profile: SARI });
    signedInAs();
    renderRoutes(routes, '/app/profile');

    await waitFor(() => expect(screen.getByText('private page')).toBeInTheDocument());

    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });
});
