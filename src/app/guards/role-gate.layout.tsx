// shell.md §6: a group of routes for some roles, named in the route's `handle.roles` (route-handle.ts). Another role
// gets "Role unavailable" and the page below is never mounted, so it sends no request (SH-11, FR-011).
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Outlet, useLocation, useMatches } from 'react-router';
import { Lorem } from '../../shared/ui/Lorem';
import type { RouteHandle } from '../route-handle';
import { roleLabel } from '../session/profile-rules';
import { useSession } from '../session/session';
import { OTHER_ROLE, ROLE_UNAVAILABLE_TWO, roleBody } from '../states/states.copy';
import { ForbiddenState } from '../states/states';

// "This screen is for {role} accounts." names one role, so the screen open to two uses the COPY-104 placeholder (SH-12)
const TWO_ROLE_PLACEHOLDER = new Set(['/app/campaigns/new']);

export function Component() {
  const session = useSession();
  const { pathname } = useLocation();
  const roles = useMatches()
    .map((match) => (match.handle as RouteHandle | undefined)?.roles)
    .find((allowed) => allowed !== undefined);

  // RequireSession renders this only once the profile is known; anything else shows nothing private
  if (session.phase !== 'ready') {
    return null;
  }

  if (roles === undefined || roles.includes(session.profile.role)) {
    return <Outlet />;
  }

  return (
    <ForbiddenState>
      {TWO_ROLE_PLACEHOLDER.has(pathname) ? (
        <Lorem
          id={ROLE_UNAVAILABLE_TWO}
          values={{
            roleA: roles.map(roleLabel)[0] ?? OTHER_ROLE,
            roleB: roles.map(roleLabel)[1] ?? OTHER_ROLE,
          }}
        />
      ) : (
        roleBody(roles.map(roleLabel)[0] ?? OTHER_ROLE)
      )}
    </ForbiddenState>
  );
}
