// shell.md §4 "Sign out": leave a private page first, then drop the session, then say so. The header menu and S11's
// Wallet panel both end the session this way.
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useLocation, useNavigate } from 'react-router';
import { useCallback } from 'react';
import { useSession } from '../session/session';
import { SHELL_COPY } from './shell.copy';
import { useToast } from './toast-context';

export function useSignOut(): () => void {
  const { signOut } = useSession();
  const { pathname } = useLocation();
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
