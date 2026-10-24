// docs/BE/features/donor.md §1 and §2: the bodies the S13 spec answers with — the mockup donor Alex, 250 USDC to "A new
// tide for Demak", 1,200 to "Roots that stay" and 900 to "Back to the mangroves".
import type { Json } from './campaigns';

const ROOTS = '0x0000000000000000000000000000000000000003';

const flag = (id: string, treeId: string, status: string, reasonText: string): Json => ({
  id,
  treeId,
  campaign: { address: ROOTS, title: 'Roots that stay' },
  status,
  reasonText,
  createdAt: '2026-10-22T08:41:09.330Z',
  openedAt: status === 'open' ? '2026-10-20T10:03:39.000Z' : null,
});

export const DASHBOARD: Json = {
  walletAddress: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
  totals: {
    campaigns: 3,
    contributedAmount: '2350000000',
    payoutsReleased: '8225000000',
    treesPlanted: 1884,
    survivalRateBps: 9686,
    openFlags: 3,
  },
  carbon: {
    issued: { label: 'issued', issuedAmount: '1200', allocatedAmount: '1600' },
    unfilled: { label: 'pre-certification', unfilledAmount: '933' },
  },
  flags: {
    open: 2,
    pending: 1,
    total: 3,
    items: [
      flag(
        '3b9e4c1a',
        '3103',
        'pending',
        'Reason saved; wallet transaction has not been confirmed.',
      ),
      flag('2a8d3b0f', '3092', 'open', 'Recent evidence needs review.'),
      flag('1f6c2a9e', '3091', 'open', 'Tree condition needs an independent check.'),
    ],
  },
};

const NO_TREES = { planted: 0, alive: 0, flagged: 0, dead: 0, removed: 0, completed: 0 };

const DEMAK_CARD: Json = {
  campaign: {
    address: '0x0000000000000000000000000000000000000001',
    status: 'funding',
    title: 'A new tide for Demak',
    species: { code: 'RHIZOPHORA_MUCRONATA', name: 'Rhizophora mangrove' },
    region: { name: 'Demak, Central Java' },
    treeTarget: 1000,
    fundingTarget: '10000000000',
    fundedAmount: '6840000000',
    progressBps: 6840,
  },
  contributedAmount: '250000000',
  fundingShareBps: 365,
  refundedAmount: '0',
  trees: NO_TREES,
  payoutsReleased: '0',
  planterBudget: '4788000000',
  releasedBps: 0,
  carbon: {
    campaignEstimate: null,
    reservation: null,
    issuedHoldings: { label: 'issued', issuedAmount: '0' },
  },
};

export const ROOTS_CARD: Json = {
  campaign: {
    address: ROOTS,
    status: 'active',
    title: 'Roots that stay',
    species: { code: 'SWIETENIA_MACROPHYLLA', name: 'Mahogany' },
    region: { name: 'Banyumas, Central Java' },
    treeTarget: 1200,
    fundingTarget: '18000000000',
    fundedAmount: '18000000000',
    progressBps: 10000,
  },
  contributedAmount: '1200000000',
  fundingShareBps: 667,
  refundedAmount: '0',
  trees: { planted: 984, alive: 948, flagged: 2, dead: 20, removed: 14, completed: 0 },
  payoutsReleased: '2100000000',
  planterBudget: '12600000000',
  releasedBps: 1666,
  carbon: {
    campaignEstimate: { label: 'pre-certification', estimatedAmount: '8005' },
    reservation: {
      label: 'pre-certification',
      reservedAmount: '533',
      allocatedAmount: '0',
      unfilledAmount: '533',
      declined: false,
    },
    issuedHoldings: { label: 'issued', issuedAmount: '0' },
  },
};

export const MANGROVES_CARD: Json = {
  campaign: {
    address: '0x0000000000000000000000000000000000000006',
    status: 'completed',
    title: 'Back to the mangroves',
    species: { code: 'RHIZOPHORA_MUCRONATA', name: 'Rhizophora mangrove' },
    region: { name: 'Cilacap, Central Java' },
    treeTarget: 900,
    fundingTarget: '9000000000',
    fundedAmount: '9000000000',
    progressBps: 10000,
  },
  contributedAmount: '900000000',
  fundingShareBps: 1000,
  refundedAmount: '25000000',
  trees: { planted: 900, alive: 0, flagged: 0, dead: 10, removed: 15, completed: 875 },
  payoutsReleased: '6125000000',
  planterBudget: '6300000000',
  releasedBps: 9722,
  carbon: {
    campaignEstimate: { label: 'pre-certification', estimatedAmount: '20000' },
    reservation: {
      label: 'pre-certification',
      reservedAmount: '2000',
      allocatedAmount: '1600',
      unfilledAmount: '400',
      declined: false,
    },
    issuedHoldings: { label: 'issued', issuedAmount: '1200' },
  },
};

/** A `GET /donor/campaigns` answer. */
export const cardsOf = (
  items: Json[],
  nextCursor: string | null = null,
  total = items.length,
): Json => ({ items, nextCursor, total });

export const CARDS: Json[] = [DEMAK_CARD, ROOTS_CARD, MANGROVES_CARD];

/** The dashboard of a wallet that supported nothing (FR-070 #1). */
export const EMPTY_DASHBOARD: Json = {
  ...DASHBOARD,
  totals: {
    campaigns: 0,
    contributedAmount: '0',
    payoutsReleased: '0',
    treesPlanted: 0,
    survivalRateBps: null,
    openFlags: 0,
  },
  carbon: {
    issued: { label: 'issued', issuedAmount: '0', allocatedAmount: '0' },
    unfilled: { label: 'pre-certification', unfilledAmount: '0' },
  },
  flags: { open: 0, pending: 0, total: 0, items: [] },
};
