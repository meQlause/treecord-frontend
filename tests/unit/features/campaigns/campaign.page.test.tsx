import { onlineManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Component } from '../../../../src/features/campaigns/campaign.page';
import { ApiError } from '../../../../src/shared/api/errors';
import { setReducedMotion } from '../../app/shell/harness';
import { apiMock, resetPrivy } from '../../session-mocks';
import { renderAt } from './harness';

vi.mock('@privy-io/react-auth', async () => (await import('../../session-mocks')).privyModule);
vi.mock(
  '../../../../src/app/session/api',
  async () => (await import('../../session-mocks')).apiModule,
);
vi.mock(
  '../../../../src/app/session/config',
  async () => (await import('../../session-mocks')).configModule,
);

const ADDRESS = '0x0000000000000000000000000000000000000001';

const CAMPAIGN = {
  address: ADDRESS,
  chainId: 84532,
  status: 'funding',
  title: 'A new tide for Demak',
  species: { code: 'RHIZOPHORA_MUCRONATA', name: 'Rhizophora mangrove' },
  region: { name: 'Demak, Central Java', radiusM: 2500 },
  treeTarget: 1000,
  commitmentUnits: 36,
  fundingTarget: '10000000000',
  fundedAmount: '6840000000',
  progressBps: 6840,
  fundingDeadline: '2026-11-10T00:00:00.000Z',
  claimDeadline: '2026-12-10T00:00:00.000Z',
  daysLeft: 18,
  fundingDeadlinePassed: false,
  claimDeadlinePassed: false,
  split: { incentivesBps: 7000 },
  budget: [
    { bucket: 'incentives', bps: 7000, amount: '7000000000' },
    { bucket: 'seedlings', bps: 1000, amount: '1000000000' },
    { bucket: 'verification', bps: 500, amount: '500000000' },
    { bucket: 'reserve', bps: 1000, amount: '1000000000' },
    { bucket: 'fee', bps: 500, amount: '500000000' },
  ],
  incentiveSchedule: [
    { milestone: 0, month: 0, bps: 1000 },
    { milestone: 1, month: 3, bps: 1000 },
    { milestone: 2, month: 6, bps: 1000 },
    { milestone: 3, month: 12, bps: 1500 },
    { milestone: 4, month: 24, bps: 1500 },
    { milestone: 5, month: 36, bps: 4000 },
  ],
  slots: { anchor: 250, open: 750, planted: 0, openAvailable: 750 },
};

const viewer = (role: string, changes: Record<string, unknown> = {}) => ({
  role,
  walletAddress: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
  contributedAmount: '0',
  refundedAmount: '0',
  claim: null,
  ...changes,
});

const routes = [
  { path: '/campaigns/:address', Component },
  { path: '/sign-in', Component: () => <p>sign in</p> },
];

const serve = (campaign: Record<string, unknown>, who: object | null = null) =>
  apiMock.mockResolvedValue({ campaign, viewer: who });

const open = () => renderAt(routes, `/campaigns/${ADDRESS}`);

let restoreMotion = (): void => undefined;

beforeEach(() => {
  resetPrivy();
  apiMock.mockReset();
  restoreMotion = setReducedMotion(true);
});

afterEach(() => {
  restoreMotion();
  onlineManager.setOnline(true);
});

describe('S04 campaign page, read', () => {
  it('P-5: draws the hero, facts, funding figures and dates (browser zone)', async () => {
    serve(CAMPAIGN);
    open();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'A new tide for Demak' }),
    ).toBeVisible();
    expect(apiMock).toHaveBeenCalledWith(`/campaigns/${ADDRESS}`, expect.anything());
    expect(document.title).toBe('A new tide for Demak · Treecord');
    expect(screen.getByText('Demak, Central Java')).toBeInTheDocument();
    expect(screen.getByText('2,500 m')).toBeInTheDocument();
    expect(screen.getByText('36 months')).toBeInTheDocument();
    expect(screen.getByText('Base Sepolia')).toBeInTheDocument();
    expect(screen.getByText('68%')).toBeInTheDocument();
    expect(screen.getByText('raised of 10,000 USDC')).toBeInTheDocument();
    expect(screen.getByText('18 days left')).toBeInTheDocument();
    expect(screen.getByText('Planting starts once funded')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Impact report/ })).toHaveAttribute(
      'href',
      `/campaigns/${ADDRESS}/report`,
    );
    expect(screen.queryByText('Campaign actions')).toBeNull();
  });

  it('FR-040: the chips preview trees and the planters share', async () => {
    serve(CAMPAIGN);
    open();
    await screen.findByText('≈ 10 trees');

    await userEvent.click(screen.getByRole('button', { name: '25' }));

    expect(screen.getByText('≈ 2 trees')).toBeInTheDocument();
    expect(screen.getByText('17.5 USDC paid to planters as the trees survive')).toBeInTheDocument();
  });

  it('FR-041 #1: signed out, the call to action leads to sign-in with the way back', async () => {
    serve(CAMPAIGN);
    open();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Sign in to contribute 100 USDC' }),
    );

    expect(screen.getByText('sign in')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(
      `/sign-in?returnTo=%2Fcampaigns%2F${ADDRESS}`,
    );
  });
});

describe('S04 campaign page, states of the funding panel', () => {
  it('P-6: past the deadline there is no call to action, and a donor is offered Start refund (not live yet)', async () => {
    serve({ ...CAMPAIGN, fundingDeadlinePassed: true, daysLeft: null }, viewer('donor'));
    open();

    expect(
      await screen.findByText('Funding deadline passed · refunds can start'),
    ).toBeInTheDocument();
    expect(screen.getByText('Deadline passed')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start refund' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Contribute/ })).toBeNull();
  });

  it('P-7: an active campaign says funding is complete and shows the planted share', async () => {
    const active = {
      ...CAMPAIGN,
      status: 'active',
      treeTarget: 1200,
      slots: { ...CAMPAIGN.slots, planted: 984 },
    };

    serve(active, viewer('donor', { contributedAmount: '250000000' }));
    open();

    expect(await screen.findByText('984 of 1,200')).toBeInTheDocument();
    expect(screen.getByText('trees verified in the field')).toBeInTheDocument();
    expect(screen.getByText('Funding complete')).toBeInTheDocument();
    expect(
      screen.getByText('Funding complete. Follow the campaign impact report.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Contribution/)).toBeNull();
  });

  it('P-8: a refunding campaign says refunds are available', async () => {
    serve({ ...CAMPAIGN, status: 'refunding', daysLeft: null }, viewer('donor'));
    open();

    expect(await screen.findByText('Refunds available to contributors')).toBeInTheDocument();
    expect(screen.getByText('Campaign read-only for this account.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Claim refund' })).toBeNull();
  });

  it('FR-041: an operator is sent to operations, an auditor sees it read-only', async () => {
    serve(CAMPAIGN, viewer('operator'));
    const first = open();

    expect(await screen.findByRole('button', { name: 'Open operations' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Open operations' })).toHaveAttribute(
      'href',
      `/app/operator/campaigns/${ADDRESS}`,
    );
    first.unmount();

    serve(CAMPAIGN, viewer('auditor'));
    open();

    expect(await screen.findByRole('button', { name: 'See campaign actions' })).toBeVisible();
    expect(screen.getByText('Campaign read-only for this account.')).toBeInTheDocument();
  });

  it('wallet missing: the callout stands in for the action and Try again reads again', async () => {
    serve(CAMPAIGN, viewer('donor', { walletAddress: null }));
    open();

    const callout = await screen.findByText(
      'Your wallet is still being prepared. Try again in a moment.',
    );

    await userEvent.click(
      within(callout.parentElement as HTMLElement).getByRole('button', { name: 'Try again' }),
    );

    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(2));
  });
});

describe('S04 campaign page, copy and failures', () => {
  it('P-11 / P-12: copying toasts, and a blocked clipboard toasts the advisory', async () => {
    serve(CAMPAIGN);
    open();
    const copy = await screen.findByTitle('Copy full campaign address');
    const writeText = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('denied'));

    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await userEvent.click(copy);
    expect(await screen.findByText('Campaign address copied')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(ADDRESS);

    await userEvent.click(copy);
    expect(
      await screen.findByText('Couldn’t copy. Select the address to copy it.'),
    ).toBeInTheDocument();
  });

  it('P-2: no such campaign says so and goes back to the catalog', async () => {
    apiMock.mockRejectedValue(new ApiError({ code: 'not_found', message: 'none', status: 404 }));
    open();

    expect(await screen.findByRole('heading', { name: 'Campaign not found' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to campaigns' })).toHaveAttribute(
      'href',
      '/campaigns',
    );
    expect(document.title).toBe('Not found · Treecord');
  });

  it('P-2: a malformed address is the same page', async () => {
    apiMock.mockRejectedValue(new ApiError({ code: 'invalid_path', message: 'bad', status: 400 }));
    open();

    expect(await screen.findByRole('heading', { name: 'Campaign not found' })).toBeVisible();
  });

  it('P-3: a failed read offers Try again, which reads again', async () => {
    apiMock.mockRejectedValue(
      new ApiError({ code: 'service_unavailable', message: 'down', status: 503 }),
    );
    open();

    expect(await screen.findByText('Could not load this page')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(2));
  });

  it('P-1: the back link is there at once while the read is pending', () => {
    apiMock.mockReturnValue(new Promise(() => undefined));
    open();

    expect(screen.getByRole('link', { name: 'All campaigns' })).toHaveAttribute(
      'href',
      '/campaigns',
    );
    expect(screen.queryByText(/USDC/)).toBeNull();
  });

  it('P-4: offline, the saved page stays under the offline banner with its controls disabled', async () => {
    serve(CAMPAIGN);
    open();
    await screen.findByText('A new tide for Demak', { selector: 'h1' });

    act(() => onlineManager.setOnline(false));

    expect(await screen.findByText(/Offline · showing saved data/)).toBeInTheDocument();
    expect(screen.getByTitle('Copy full campaign address')).toBeDisabled();
  });
});
