// shell.md §6: every `/app/*` route. No session means S02 before anything private is rendered (FR-010, "never
// rendered first and hidden afterwards"); a session waits for `GET /me` (SH-2) before the page below mounts. A session
// whose wallet is still being prepared (SI-13) goes back to S02 too: the sign-in finishes there, not in the workspace.

import { useQueryClient } from '@tanstack/react-query';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Navigate, Outlet, useLocation } from 'react-router';
import { RECORD_PATH } from '../shell/shell-routes';
import { signInUrl } from '../return-to';
import { SESSION_EXPIRED } from '../session/expire';
import { useSession } from '../session/session';
import { ME_KEY } from '../session/use-me';
import { ErrorState, LoadingState } from '../states/states';
import { WorkspaceMain } from '../states/workspace-main';

const APP = '/app';

export function Component() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { pathname, search } = useLocation();

  if (session.phase === 'signed-out' || session.phase === 'wallet-pending') {
    // PageMotion keeps the page that is leaving for its exit, and that copy already reads /sign-in: it must not
    // send the visitor to S02 again with S02 as the page to come back to
    return pathname.startsWith(APP) ? (
      <Navigate
        replace
        to={signInUrl(pathname + search)}
        state={
          session.phase === 'signed-out' && session.expired ? { reason: SESSION_EXPIRED } : null
        }
      />
    ) : null;
  }

  const body = {
    resolving: <LoadingState />,
    error: <ErrorState onRetry={() => void queryClient.refetchQueries({ queryKey: ME_KEY })} />,
    ready: <Outlet />,
  }[session.phase];

  return <WorkspaceMain capturing={pathname.startsWith(RECORD_PATH)}>{body}</WorkspaceMain>;
}
