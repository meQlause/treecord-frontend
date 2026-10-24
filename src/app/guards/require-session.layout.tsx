// shell.md §6: every `/app/*` route. No session means S02 before anything private is rendered (FR-010, "never
// rendered first and hidden afterwards"); a session waits for `GET /me` (SH-2) before the page below mounts.

import { useQueryClient } from '@tanstack/react-query';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Navigate, Outlet, useLocation } from 'react-router';
import { signInUrl } from '../return-to';
import { useSession } from '../session/session';
import { ME_KEY } from '../session/use-me';
import { ErrorState, LoadingState } from '../states/states';
import { WorkspaceMain } from '../states/workspace-main';

export function Component() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { pathname, search } = useLocation();

  if (session.phase === 'signed-out') {
    return <Navigate replace to={signInUrl(pathname + search)} />;
  }

  const body = {
    resolving: <LoadingState />,
    error: <ErrorState onRetry={() => void queryClient.refetchQueries({ queryKey: ME_KEY })} />,
    ready: <Outlet />,
  }[session.phase];

  return <WorkspaceMain>{body}</WorkspaceMain>;
}
