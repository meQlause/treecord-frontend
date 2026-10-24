// Shared by the campaigns page tests: the shell providers around a route, the API mocked (no network), motion still.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import type { ComponentType } from 'react';
import { MotionProvider } from '../../../../src/app/shell/motion-context';
import { ToastArea, ToastProvider } from '../../../../src/app/shell/toast-context';

function Where() {
  const { pathname, search } = useLocation();

  return <output data-testid="where">{`${pathname}${search}`}</output>;
}

/** `routes` at `path` under the providers the pages need; the URL is in the `where` test id. */
export function renderAt(routes: { path: string; Component: ComponentType }[], path: string) {
  const router = createMemoryRouter(
    routes.map(({ path: routePath, Component }) => ({
      path: routePath,
      element: (
        <>
          <Component />
          <Where />
        </>
      ),
    })),
    { initialEntries: [path] },
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MotionProvider>
          <ToastProvider>
            <RouterProvider router={router} />
            <ToastArea />
          </ToastProvider>
        </MotionProvider>
      </QueryClientProvider>,
    ),
  };
}
