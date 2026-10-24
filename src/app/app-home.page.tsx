// shell.md §6, SH-6: `/app` replaces itself with the role's home; until the replace lands, the interim page below.
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useNavigate } from 'react-router';
import { useEffect } from 'react';
import { ArrowLink } from '../shared/ui/ArrowLink';
import { YOUR_WORKSPACE, openWorkspace } from './app.copy';
import { roleHome } from './session/profile-rules';
import { useSession } from './session/session';

export function Component() {
  const session = useSession();
  const navigate = useNavigate();
  const role = session.phase === 'ready' ? session.profile.role : undefined;
  const home = role === undefined ? undefined : roleHome(role);

  useEffect(() => {
    if (home !== undefined) {
      void navigate(home, { replace: true });
    }
  }, [home, navigate]);

  if (role === undefined || home === undefined) {
    return null;
  }

  return (
    <>
      <h1>{YOUR_WORKSPACE}</h1>
      <ArrowLink to={home}>{openWorkspace(role)}</ArrowLink>
    </>
  );
}
