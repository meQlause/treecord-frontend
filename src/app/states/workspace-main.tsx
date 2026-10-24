import type { ReactNode } from 'react';
import { OFFLINE } from './states.copy';
import { useOnline } from './use-online';

// The mockup's `Workspace` frame (workspace.jsx:39): the `main` of every workspace route. Offline (SH-9) puts the
// callout above the page and disables every control in it; the page's cached data stays visible.
export function WorkspaceMain({ children }: { children: ReactNode }) {
  const online = useOnline();

  return (
    <div className="ws-layout">
      <main className="ws-main" id="main-content" tabIndex={-1}>
        {!online && <p className="ws-callout">{OFFLINE}</p>}
        <fieldset className="ws-state-body" disabled={!online}>
          {children}
        </fieldset>
      </main>
    </div>
  );
}
