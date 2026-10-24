// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../shared/art/Icon';
import { shortAddress } from '../../shared/format/address';
import type { Role } from '../route-handle';
import { ROLE_LABEL, SHELL_COPY, accountLabel } from './shell.copy';

// shell.md §4 Account menu. Native <details> keeps it keyboard-usable; it closes on a route change, on a press
// outside and on Escape (shell.jsx:60-77).
const ICON_SIZE = 16;
const CHEVRON_SIZE = 13;
const SPRING = { type: 'spring', stiffness: 480, damping: 34 } as const;
const SHOWN = { opacity: 1, y: 0, scale: 1 };
const HIDDEN = { opacity: 0, y: -6, scale: 0.97 };

/** What the menu reads of the profile (SH-3..SH-5). */
export type AccountProfile = {
  role: Role;
  displayName: string | null;
  walletAddress: string | null;
  email: string | null;
};

/** SH-4: no display name yet, so the part of the sign-in email before "@". */
const nameOf = ({ displayName, email, role }: AccountProfile): string =>
  displayName ?? email?.split('@')[0] ?? ROLE_LABEL[role];

/** Closes `menu` on a press outside it, or Escape (focus returns to the summary). */
function useDismiss(menu: { current: HTMLDetailsElement | null }): void {
  useEffect(() => {
    const onPress = (event: PointerEvent): void => {
      if (menu.current?.open && !menu.current.contains(event.target as Node)) {
        menu.current.open = false;
      }
    };

    const onKey = (event: KeyboardEvent): void => {
      if (menu.current?.open && event.key === 'Escape') {
        menu.current.open = false;
        menu.current.querySelector('summary')?.focus();
      }
    };

    window.addEventListener('pointerdown', onPress);
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('pointerdown', onPress);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);
}

export function AccountMenu({
  profile,
  onSignOut,
}: {
  profile: AccountProfile;
  onSignOut: () => void;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const name = nameOf(profile);
  const role = ROLE_LABEL[profile.role];

  useEffect(() => {
    if (menu.current) {
      menu.current.open = false;
    }
  }, [pathname]);
  useDismiss(menu);

  return (
    <details
      className="account-menu"
      ref={menu}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary aria-label={accountLabel(name, role)}>
        <span className="donor-avatar">{name.slice(0, 1).toUpperCase()}</span>
        <span className="account-name">
          <span data-testid="account-name">{name}</span>
          <small>{role}</small>
        </span>
        <Icon name="down" size={CHEVRON_SIZE} />
      </summary>
      <motion.div
        className="account-pop"
        role="menu"
        initial={false}
        animate={open ? SHOWN : HIDDEN}
        transition={SPRING}
        style={{ transformOrigin: 'top right' }}
      >
        <div className="account-pop-head">
          <strong className="wrap-any">{name}</strong>
          <small>{profile.walletAddress ? shortAddress(profile.walletAddress) : role}</small>
        </div>
        <Link role="menuitem" to="/app/profile">
          <Icon name="profile" size={ICON_SIZE} />
          {SHELL_COPY.profile}
        </Link>
        {profile.role === 'planter' && (
          <Link role="menuitem" to="/app/planter/device">
            <Icon name="wifi" size={ICON_SIZE} />
            {SHELL_COPY.thisDevice}
          </Link>
        )}
        <button type="button" role="menuitem" onClick={onSignOut}>
          <Icon name="back" size={ICON_SIZE} />
          {SHELL_COPY.signOut}
        </button>
      </motion.div>
    </details>
  );
}
