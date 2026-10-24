import { describe, expect, it } from 'vitest';
import type { CampaignDetail, Viewer } from '../../../../src/features/campaigns/campaigns.api';
import {
  branchesFor,
  cellsOf,
  ctaLabel,
  deadlinesOf,
  fundingClosed,
  litTrees,
  previewFor,
  signInPath,
} from '../../../../src/features/campaigns/campaign.rules';

const DEMAK = {
  address: '0x0000000000000000000000000000000000000001',
  status: 'funding',
  treeTarget: 1000,
  fundingTarget: '10000000000',
  fundingDeadline: '2026-11-10T00:00:00.000Z',
  claimDeadline: '2026-12-10T00:00:00.000Z',
  fundingDeadlinePassed: false,
  claimDeadlinePassed: false,
  split: { incentivesBps: 7000 },
  slots: { anchor: 250, open: 750, planted: 0, openAvailable: 750 },
} as unknown as CampaignDetail;

const viewer = (role: Viewer['role'], changes: Partial<Viewer> = {}): Viewer => ({
  role,
  walletAddress: '0x71c7',
  contributedAmount: '0',
  refundedAmount: '0',
  ...changes,
});

const NOW = Date.parse('2026-10-23T09:12:31.000Z');

describe('previewFor', () => {
  it('buys floor(amount / price) trees, at least one, and pays planters the incentive share', () => {
    expect(previewFor(100, DEMAK)).toEqual({ trees: 10, share: 70_000_000n });
    expect(previewFor(25, DEMAK)).toEqual({ trees: 2, share: 17_500_000n });
    expect(previewFor(5, DEMAK).trees).toBe(1);
  });

  it('does not divide by a zero target', () => {
    expect(previewFor(100, { ...DEMAK, fundingTarget: '0' }).trees).toBe(1);
  });
});

describe('plot and preview cells', () => {
  it('scales a part of the target onto the cells', () => {
    expect(cellsOf(250, 1000)).toBe(25);
    expect(cellsOf(984, 1200)).toBe(82);
    expect(cellsOf(5, 0)).toBe(0);
  });

  it('lights the bought trees while funding and the planted share after', () => {
    const active = { ...DEMAK, status: 'active', slots: { ...DEMAK.slots, planted: 500 } };

    expect(litTrees(DEMAK, 10)).toBe(10);
    expect(litTrees(DEMAK, 99)).toBe(25);
    expect(litTrees(active as CampaignDetail, 10)).toBe(13);
  });
});

describe('deadlines', () => {
  it('shows dates while open and Closed once passed', () => {
    const open = deadlinesOf(DEMAK, NOW);
    const shut = { ...DEMAK, fundingDeadlinePassed: true, claimDeadlinePassed: true };

    expect(open.funding).toEqual({ text: '10 Nov 2026', instant: DEMAK.fundingDeadline });
    expect(open.claim.text).toBe('10 Dec 2026');
    expect(deadlinesOf(shut, NOW)).toMatchObject({
      funding: { text: 'Closed', instant: null },
      claim: { text: 'Closed', instant: null },
    });
  });

  it('reads the clock for a funding date only once the status has left funding', () => {
    const active = { ...DEMAK, status: 'active' } as CampaignDetail;

    expect(fundingClosed(active, NOW)).toBe(false);
    expect(fundingClosed(active, Date.parse('2026-12-01T00:00:00Z'))).toBe(true);
  });
});

describe('the call to action', () => {
  it('names who is looking', () => {
    expect(ctaLabel(null, 100)).toBe('Sign in to contribute 100 USDC');
    expect(ctaLabel(viewer('donor'), 25)).toBe('Contribute 25 USDC');
    expect(ctaLabel(viewer('planter'), 25)).toBe('Claim open slots');
    expect(ctaLabel(viewer('operator'), 25)).toBe('Open operations');
    expect(ctaLabel(viewer('auditor'), 25)).toBe('See campaign actions');
  });

  it('comes back to the campaign after sign-in', () => {
    expect(signInPath(DEMAK.address)).toBe(
      '/sign-in?returnTo=%2Fcampaigns%2F0x0000000000000000000000000000000000000001',
    );
  });
});

describe('branchesFor', () => {
  const passed = { ...DEMAK, fundingDeadlinePassed: true } as CampaignDetail;
  const refunding = { ...DEMAK, status: 'refunding' } as CampaignDetail;

  it('offers a donor D04 while funding is open and Start refund once it is not', () => {
    expect(branchesFor(DEMAK, viewer('donor'))).toMatchObject({
      contribute: true,
      startRefund: false,
      readOnly: false,
    });
    expect(branchesFor(passed, viewer('donor'))).toMatchObject({
      contribute: false,
      startRefund: true,
    });
  });

  it('never offers an auditor an action', () => {
    expect(branchesFor(passed, viewer('auditor'))).toMatchObject({
      startRefund: false,
      readOnly: true,
    });
  });

  it('offers D05 to a donor who gave, and the read-only line to one who did not', () => {
    const gave = viewer('donor', { contributedAmount: '250000000' });

    expect(branchesFor(refunding, gave).refund).toBe(true);
    expect(branchesFor(refunding, viewer('donor')).readOnly).toBe(true);
  });

  it('gives a planter D06 whatever the status and an operator the link', () => {
    expect(branchesFor(DEMAK, viewer('planter')).claim).toBe(true);
    expect(branchesFor(DEMAK, viewer('operator'))).toMatchObject({
      operator: true,
      readOnly: false,
    });
  });

  it('says the wallet is missing only when a wallet action applies', () => {
    expect(branchesFor(DEMAK, viewer('donor', { walletAddress: null })).walletMissing).toBe(true);
    expect(branchesFor(DEMAK, viewer('operator', { walletAddress: null })).walletMissing).toBe(
      false,
    );
  });

  it('tells a donor on an active campaign to follow the report', () => {
    const active = { ...DEMAK, status: 'active' } as CampaignDetail;

    expect(branchesFor(active, viewer('donor'))).toMatchObject({
      donorActive: true,
      readOnly: false,
    });
  });
});
