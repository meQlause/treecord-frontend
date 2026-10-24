import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AccountMenu, type AccountProfile } from '../../../../src/app/shell/AccountMenu';
import { renderShell } from './harness';

const SARI: AccountProfile = {
  role: 'planter',
  displayName: 'Sari',
  walletAddress: '0x4b9e1234567890abcdef1234567890abcdef9d0e',
  email: 'sari@example.org',
};
const ALEX: AccountProfile = {
  role: 'donor',
  displayName: 'Alex',
  walletAddress: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
  email: null,
};
const NEW_DONOR: AccountProfile = {
  role: 'donor',
  displayName: null,
  walletAddress: null,
  email: 'wira@example.org',
};

const open = (profile: AccountProfile, onSignOut = vi.fn(), path = '/campaigns') => {
  const view = renderShell(<AccountMenu profile={profile} onSignOut={onSignOut} />, path);
  const details = view.container.querySelector('details') as HTMLDetailsElement;

  details.open = true;
  fireEvent(details, new Event('toggle'));

  return { details, onSignOut };
};

describe('AccountMenu', () => {
  it('names the account and role on the summary, and shows the short wallet in the popover (SH-AC2, SH-AC4)', () => {
    open(SARI);

    expect(screen.getByLabelText('Account: Sari, Planter')).toBeInTheDocument();
    expect(screen.getByText('0x4b9e…9d0e')).toBeInTheDocument();
    expect(screen.getAllByText('Sari')).toHaveLength(2);
  });

  it('lists Profile, This device and Sign out for a Planter (SH-AC4)', () => {
    open(SARI);

    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Profile',
      'This device',
      'Sign out',
    ]);
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/app/profile',
    );
    expect(screen.getByRole('menuitem', { name: 'This device' })).toHaveAttribute(
      'href',
      '/app/planter/device',
    );
  });

  it('lists only Profile and Sign out for a Donor (SH-AC5)', () => {
    open(ALEX);

    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Profile',
      'Sign out',
    ]);
  });

  it('uses the email before "@" and the role when there is no name or wallet (SH-4, SH-5)', () => {
    open(NEW_DONOR);

    expect(screen.getByLabelText('Account: wira, Donor')).toBeInTheDocument();
    expect(screen.getByTestId('account-name')).toHaveTextContent('wira');
    expect(document.querySelector('.donor-avatar')).toHaveTextContent('W');
    expect(document.querySelector('.account-pop-head small')).toHaveTextContent('Donor');
  });

  it('calls the sign-out handler', async () => {
    const { onSignOut } = open(ALEX);

    await userEvent.setup().click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape and returns focus to the summary (SH-AC6)', () => {
    const { details } = open(ALEX);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(details.open).toBe(false);
    expect(document.activeElement?.tagName).toBe('SUMMARY');
  });

  it('closes on a press outside, not on a press inside (SH-AC6)', () => {
    const { details } = open(ALEX);

    fireEvent.pointerDown(screen.getByRole('menuitem', { name: 'Profile' }));
    expect(details.open).toBe(true);

    fireEvent.pointerDown(document.body);
    expect(details.open).toBe(false);
  });

  it('closes when the route changes (SH-AC6)', async () => {
    const { details } = open(ALEX);

    await userEvent.setup().click(screen.getByRole('menuitem', { name: 'Profile' }));

    expect(screen.getByTestId('where')).toHaveTextContent('/app/profile');
    expect(details.open).toBe(false);
  });
});
