import { createElement, type ReactNode } from 'react';
import { Icon, type IconName } from '../art/Icon';

// P12. Three mockup shapes behind one name: `hero` (main.jsx:54 .empty-state), `compact` (workspace-ui.jsx:9 .ws-empty)
// and `inline` (report.jsx:25 .rp-empty). The error tone swaps the icon disc for the warning one.
const HERO_ICON = 42;
const COMPACT_ICON = 34;

type EmptyStateProps =
  | {
      variant?: 'hero';
      tone?: 'default' | 'error';
      icon?: IconName;
      eyebrow?: string;
      /** The title's heading level: a page that is only this state makes it the `h1`. */
      level?: 1 | 2;
      title: string;
      description?: string;
      /** The action: a button or link. */
      children?: ReactNode;
    }
  | { variant: 'compact'; icon?: IconName; title: ReactNode; children?: ReactNode }
  | { variant: 'inline'; art: ReactNode; children: ReactNode };

const TONE = {
  default: { discClass: 'empty-icon', role: 'status', icon: 'tree' },
  error: { discClass: 'empty-icon error-icon', role: 'alert', icon: 'warning' },
} as const;

const titleTag = (level: 1 | 2 | undefined): 'h1' | 'h2' => (level === 1 ? 'h1' : 'h2');

export function EmptyState(props: EmptyStateProps) {
  switch (props.variant) {
    case 'compact':
      return (
        <div className="ws-empty">
          <Icon name={props.icon ?? 'leaf'} size={COMPACT_ICON} />
          <h2>{props.title}</h2>
          {props.children}
        </div>
      );
    case 'inline':
      return (
        <div className="rp-empty">
          {props.art}
          <span>{props.children}</span>
        </div>
      );
    default: {
      const tone = TONE[props.tone ?? 'default'];

      return (
        <div className="empty-state" role={tone.role}>
          <span className={tone.discClass}>
            <Icon name={props.icon ?? tone.icon} size={HERO_ICON} />
          </span>
          {props.eyebrow !== undefined && <span className="eyebrow">{props.eyebrow}</span>}
          {createElement(titleTag(props.level), null, props.title)}
          {props.description !== undefined && <p>{props.description}</p>}
          {props.children}
        </div>
      );
    }
  }
}
