// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useLocation } from 'react-router';
import { useSession } from '../session/session';
import { AppShell } from './AppShell';
import { Header } from './Header';
import { useMotion } from './motion-context';
import { appClassName } from './shell-routes';
import { SkipLink } from './SkipLink';
import { ToastArea } from './toast-context';
import { useSignOut } from './use-sign-out';

/** The layout route of every page (routes.tsx): header, role sidebar, the page, footer, toasts. */
export function Component() {
  const session = useSession();
  const { pathname } = useLocation();
  const { still } = useMotion();
  const profile = session.phase === 'ready' ? session.profile : null;
  const onSignOut = useSignOut();

  return (
    <div className={appClassName({ signedIn: profile !== null, pathname, still })}>
      <SkipLink />
      <Header profile={profile} onSignOut={onSignOut} />
      <AppShell accountRole={profile?.role ?? null} pathname={pathname} />
      <ToastArea />
    </div>
  );
}
