import { PrivyProvider, type PrivyClientConfig } from '@privy-io/react-auth';
import { QueryClientProvider } from '@tanstack/react-query';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { createBrowserRouter } from 'react-router';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { RouterProvider } from 'react-router/dom';
import { watchTitle } from './page-title';
import { routes } from './routes';
import { SessionBridge } from './session/bridge';
import { config } from './session/config';
import { expireSession } from './session/expire';
import { createQueryClient } from './session/query-client';
import { MotionProvider } from './shell/motion-context';
import { ToastProvider } from './shell/toast-context';

// the frame of shell.md §1: Privy → TanStack Query → motion and toasts → the router, whose routes are the shell
const router = createBrowserRouter(routes);

watchTitle(router);

const queryClient = createQueryClient(() => expireSession(queryClient, router));

// FR-001 email only; FR-003 the Privy app creates no wallet at login, so ask for one (D-7, phases.md)
const PRIVY_CONFIG: PrivyClientConfig = {
  loginMethods: ['email'],
  embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } },
};

export function App() {
  return (
    <PrivyProvider appId={config().privyAppId} config={PRIVY_CONFIG}>
      <QueryClientProvider client={queryClient}>
        <MotionProvider>
          <ToastProvider>
            <SessionBridge />
            <RouterProvider router={router} />
          </ToastProvider>
        </MotionProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
