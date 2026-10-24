// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, useLocation } from 'react-router';
import { isCarbonPath, isWorkspacePath } from './shell-routes';
import { SHELL_COPY } from './shell.copy';

const ACTIVE = 'nav-active';

/** Signed out only (SH-1). `.nav-active` follows the mockup's rules, `aria-current` only the exact page. */
export function PublicNav() {
  const { pathname } = useLocation();
  const carbon = isCarbonPath(pathname);

  return (
    <nav aria-label={SHELL_COPY.mainNavigation}>
      <Link
        to="/campaigns"
        className={carbon || isWorkspacePath(pathname) ? undefined : ACTIVE}
        aria-current={pathname === '/campaigns' ? 'page' : undefined}
      >
        {SHELL_COPY.campaigns}
      </Link>
      <Link
        to="/carbon"
        className={carbon ? ACTIVE : undefined}
        aria-current={pathname === '/carbon' ? 'page' : undefined}
      >
        {SHELL_COPY.carbonCredits}
      </Link>
    </nav>
  );
}
