import type { ComponentPropsWithoutRef } from 'react';
import { Icon, type IconName } from '../art/Icon';

// P1. A primitive renders the mockup's own classes (design-system §3 rule 5): `button primary`, never a new `btn`.
const VARIANT_CLASS = {
  primary: 'button primary',
  outline: 'button outline',
  text: 'text-button',
  icon: 'icon-button',
  'sign-in': 'sign-in-button',
};

const ARROW_SIZE = 16;
const BUSY_LABEL = 'Processing…';

type Shared = Omit<ComponentPropsWithoutRef<'button'>, 'className'> & {
  /** A write is in flight: shows `busyLabel`, disables the button and sets `aria-busy` at once (pattern 3). */
  busy?: boolean;
  busyLabel?: string;
  /** A trailing icon, hidden while busy. */
  icon?: IconName;
};

type ButtonProps =
  | (Shared & { variant?: 'primary' | 'outline' | 'text' | 'sign-in' })
  // an icon-only button has no text, so its name is required (design-system §3 rule 11, NFR-033)
  | (Shared & { variant: 'icon'; 'aria-label': string });

export function Button({
  variant = 'primary',
  busy,
  busyLabel = BUSY_LABEL,
  icon,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={VARIANT_CLASS[variant]}
      type="button"
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy ? busyLabel : children}
      {icon !== undefined && !busy && <Icon name={icon} size={ARROW_SIZE} />}
    </button>
  );
}
