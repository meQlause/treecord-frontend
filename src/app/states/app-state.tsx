import type { ReactNode } from 'react';
import { Banner } from '../../shared/ui/Banner';
import { OFFLINE, REFRESH } from './states.copy';
import { useOnline } from './use-online';

// Pattern 14 (mockup workspace.jsx `AppState`): the pages outside the workspace (S03, S04, S06–S09, S13–S15) get the
// offline banner above them and every control disabled. Online, it is transparent.
export function AppState({ children }: { children: ReactNode }) {
  const online = useOnline();

  if (online) {
    return children;
  }

  return (
    <>
      <div className="app-state">
        <Banner icon="wifi" action={REFRESH} onAction={() => window.location.reload()}>
          {OFFLINE}
        </Banner>
      </div>
      <fieldset className="ws-state-body" disabled>
        {children}
      </fieldset>
    </>
  );
}
