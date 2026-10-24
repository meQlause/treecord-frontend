// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { useEffect } from 'react';
import { Icon } from '../../shared/art/Icon';
import { useStickyFit } from '../../shared/ui/useStickyFit';
import type { Role } from '../route-handle';
import { GrowthArt } from './GrowthArt';
import { SIDEBAR_ITEMS, activeItem } from './sidebar-items';
import { ROLE_LABEL, sidebarNavLabel, workspaceEyebrow, workspaceLabel } from './shell.copy';

const ARROW_SIZE = 14;

/** FR-008. Sticky below the header; on phones a sideways tab row that keeps the current tab in view. */
export function RoleSidebar({ accountRole, pathname }: { accountRole: Role; pathname: string }) {
  const aside = useStickyFit<HTMLElement>({ roomVar: '--side-room' });
  const active = activeItem(pathname, accountRole);
  const label = ROLE_LABEL[accountRole];

  useEffect(() => {
    aside.current
      ?.querySelector('nav [aria-current]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [aside, pathname]);

  return (
    <aside className="donor-sidebar role-sidebar" ref={aside} aria-label={workspaceLabel(label)}>
      <div className="workspace-label eyebrow">{workspaceEyebrow(label)}</div>
      <nav aria-label={sidebarNavLabel(label)}>
        {SIDEBAR_ITEMS[accountRole].map((item) => (
          <Link key={item.to} to={item.to} aria-current={active === item.to ? 'page' : undefined}>
            <Icon name={item.icon} />
            {item.label}
            {active === item.to ? (
              <span className="sidebar-active-dot" />
            ) : (
              <Icon name="arrow" size={ARROW_SIZE} />
            )}
          </Link>
        ))}
      </nav>
      <GrowthArt />
    </aside>
  );
}
