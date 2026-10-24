// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useLocation, useNavigate } from 'react-router';
import { useCallback } from 'react';
import { useSession } from '../session/session';
import { AppShell } from './AppShell';
import { Header } from './Header';
import { useMotion } from './motion-context';
import { appClassName } from './shell-routes';
import { SHELL_COPY } from './shell.copy';
import { SkipLink } from './SkipLink';
import { ToastArea, useToast } from './toast-context';

/** shell.md §4 "Sign out": leave a private page first, then drop the session, then say so. */
function useSignOut(signOut: () => Promise<void>, pathname: string): () => void {
  const navigate = useNavigate();
  const { notify } = useToast();

  return useCallback(() => {
    void (async () => {
      if (pathname.startsWith('/app')) {
        await navigate('/campaigns');
      }

      await signOut();
      notify(SHELL_COPY.signedOut);
    })();
  }, [navigate, notify, pathname, signOut]);
}

/** The layout route of every page (routes.tsx): header, role sidebar, the page, footer, toasts. */
export function Component() {
  const session = useSession();
  const { pathname } = useLocation();
  const { still } = useMotion();
  const profile = session.phase === 'ready' ? session.profile : null;
  const onSignOut = useSignOut(session.signOut, pathname);

  return (
    <div className={appClassName({ signedIn: profile !== null, pathname, still })}>
      <SkipLink />
      <Header profile={profile} onSignOut={onSignOut} />
      <AppShell accountRole={profile?.role ?? null} pathname={pathname} />
      <ToastArea />
    </div>
  );
}
