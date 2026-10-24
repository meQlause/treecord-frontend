// SH-14: a route nobody declared. Under `/app` the workspace frame is already around it (RequireSession); a public
// path has none yet. The document title ("Not found · Treecord") comes from `page-title.ts`.
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useLocation } from 'react-router';
import { NotFoundState } from './states/states';
import { PAGE_NOT_FOUND } from './states/states.copy';
import { WorkspaceMain } from './states/workspace-main';

export function Component() {
  const { pathname } = useLocation();
  const body = <NotFoundState title={PAGE_NOT_FOUND} />;

  return pathname.startsWith('/app') ? body : <WorkspaceMain>{body}</WorkspaceMain>;
}
