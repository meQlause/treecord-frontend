import type { Role } from '../route-handle';
import { Footer } from './Footer';
import { PageMotion } from './PageMotion';
import { RoleSidebar } from './RoleSidebar';
import { RECORD_PATH } from './shell-routes';

/** FR-008: the role sidebar beside the page when signed in, except in the Record evidence focus view (SH-23). */
export function AppShell({
  accountRole,
  pathname,
}: {
  accountRole: Role | null;
  pathname: string;
}) {
  const sidebar = accountRole !== null && !pathname.startsWith(RECORD_PATH);

  return (
    <div className={sidebar ? 'app-shell' : 'app-plain'}>
      {sidebar && <RoleSidebar accountRole={accountRole} pathname={pathname} />}
      <div className="app-shell-main">
        <PageMotion />
        <Footer />
      </div>
    </div>
  );
}
