import type { ReactNode } from 'react';
import { Icon, type IconName } from '../art/Icon';

// K8. Mockup workspace-ui.jsx:6. A titled section: icon + heading, an optional `aside` on the right.
const ICON_SIZE = 20;

type PanelProps = { title: string; icon?: IconName; aside?: ReactNode; children?: ReactNode };

export function Panel({ title, icon = 'tree', aside, children }: PanelProps) {
  return (
    <section className="ws-panel">
      <div className="ws-panel-head">
        <h2>
          <Icon name={icon} size={ICON_SIZE} />
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
