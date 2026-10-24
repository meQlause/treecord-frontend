import type { ReactNode } from 'react';
import { Icon, type IconName } from '../art/Icon';
import { Button } from './Button';

// P13. Mockup `.state-banner` / `.error-banner` / `.ws-callout` (design-system §4.6).
// info = advisory (role=status): offline, session ended. error = blocking (role=alert): failed write, read or next page.
// callout = a calm wait (role=alert) with an outline Button: wallet not ready, revoke warning.
const ICON_SIZE = 18;
const RETRY_SIZE = 15;

const TONE = {
  info: { className: 'state-banner', role: 'status', icon: 'clock' },
  error: { className: 'state-banner error-banner', role: 'alert', icon: 'warning' },
  callout: { className: 'ws-callout ws-banner', role: 'alert', icon: null },
} as const;

type BannerProps = {
  tone?: keyof typeof TONE;
  /** Overrides the tone's icon; `null` draws none. */
  icon?: IconName | null;
  children: ReactNode;
  /** The one button's label ("Try again", "Refresh"); needs `onAction`. */
  action?: string;
  onAction?: () => void;
};

export function Banner({ tone = 'info', icon, children, action, onAction }: BannerProps) {
  const { className, role, icon: toneIcon } = TONE[tone];
  const glyph = icon === undefined ? toneIcon : icon;

  return (
    <div className={className} role={role}>
      {glyph !== null && <Icon name={glyph} size={ICON_SIZE} />}
      <span>{children}</span>
      {action !== undefined && tone === 'callout' && (
        <Button variant="outline" onClick={onAction}>
          {action}
        </Button>
      )}
      {action !== undefined && tone !== 'callout' && (
        <button type="button" onClick={onAction}>
          {action}
          <Icon name="retry" size={RETRY_SIZE} />
        </button>
      )}
    </div>
  );
}
