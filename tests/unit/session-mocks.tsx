// Shared fakes for the tests of the session, the guards and S02: the Privy hooks, the API function and the config,
// so no test touches the SDK or the network. A test file mocks the three modules with
// `vi.mock(path, async () => (await import('<here>')).privyModule)` (factories are hoisted, so they import lazily).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { vi } from 'vitest';
import { ToastProvider } from '../../src/app/shell/toast-context';

/** The accounts.md §1 examples. */
export const SARI = {
  id: 'bfb15801-2dac-4f8d-ba18-5cc05c96f890',
  walletAddress: '0x4b9e2f1a7c3d05e6f8a91b2c3d4e5f6a7b8c9d0e',
  role: 'planter',
  displayName: 'Sari',
  isBuyer: false,
  carbonRightsAgreementAccepted: true,
  carbonRightsAcceptedAt: '2026-10-20T02:41:09.118Z',
  createdAt: '2026-10-17T08:15:30.402Z',
} as const;

export const FIRST_SIGN_IN = {
  ...SARI,
  id: 'edf80956-1114-443e-82d2-3311ce94e47e',
  walletAddress: null,
  role: 'donor',
  displayName: null,
  carbonRightsAgreementAccepted: false,
  carbonRightsAcceptedAt: null,
} as const;

type Account = { id: string; email: { address: string }; wallet?: { address: string } };

/** What `usePrivy()` and `useLoginWithEmail()` return; a test edits it, then renders or re-renders. */
export const privyState = {
  ready: true,
  authenticated: false,
  user: null as Account | null,
  logout: vi.fn(),
  getAccessToken: vi.fn(),
  sendCode: vi.fn(),
  loginWithCode: vi.fn(),
  createWallet: vi.fn(),
};

export const signedInAs = (address = 'sari@example.com'): void => {
  privyState.authenticated = true;
  privyState.user = { id: 'did:privy:sari', email: { address } };
};

export const resetPrivy = (): void => {
  privyState.ready = true;
  privyState.authenticated = false;
  privyState.user = null;
  privyState.logout = vi.fn(() => {
    privyState.authenticated = false;
    privyState.user = null;

    return Promise.resolve();
  });
  privyState.getAccessToken = vi.fn(() => Promise.resolve('token'));
  privyState.sendCode = vi.fn(() => Promise.resolve());
  privyState.loginWithCode = vi.fn(() => Promise.resolve());
  privyState.createWallet = vi.fn(() => Promise.resolve());
};

export const privyModule = {
  usePrivy: () => privyState,
  // the specs of a screen draw its wallet actions, never run them: no wallet is connected
  useWallets: () => ({ wallets: [] }),
  useCreateWallet: () => ({ createWallet: privyState.createWallet }),
  useLoginWithEmail: () => ({
    sendCode: privyState.sendCode,
    loginWithCode: privyState.loginWithCode,
    state: { status: 'initial' },
  }),
};

export const apiMock = vi.fn();

export const apiModule = { api: apiMock, setTokenSource: vi.fn() };

export const configModule = {
  config: () => ({
    apiUrl: '/api/v1',
    privyAppId: 'app',
    chainId: 84532,
    networkLabel: 'Base Sepolia',
  }),
};

export const newQueryClient = (): QueryClient =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

/** Renders `routes` at `path` with a query client; returns both so a test can read the router's location. */
export function renderRoutes(routes: RouteObject[], path: string, state?: unknown) {
  const { pathname, search } = new URL(path, 'http://app.test');
  const router = createMemoryRouter(routes, { initialEntries: [{ pathname, search, state }] });
  const queryClient = newQueryClient();

  return {
    router,
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        {/* as in the app (App.tsx): a page that confirms with a toast needs the provider above it */}
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>,
    ),
  };
}
