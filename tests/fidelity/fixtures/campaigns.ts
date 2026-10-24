// docs/BE/features/campaigns.md §1-§3: the example bodies the S03 and S04 specs answer with.
import { ALEX, DEWI } from './shell-accounts';

export const DEMAK = '0x0000000000000000000000000000000000000001';

const SENGON_CAMPAIGN = '0x0000000000000000000000000000000000000002';

const ROOTS = '0x0000000000000000000000000000000000000003';

export const MISSING = '0x00000000000000000000000000000000000000ff';

export type Json = Record<string, unknown>;

/** The first item of campaigns.md §1: "A new tide for Demak". */
export const DEMAK_ITEM: Json = {
  address: DEMAK,
  status: 'funding',
  title: 'A new tide for Demak',
  species: { code: 'RHIZOPHORA_MUCRONATA', name: 'Rhizophora mangrove' },
  region: { name: 'Demak, Central Java' },
  treeTarget: 1000,
  commitmentUnits: 36,
  fundingTarget: '10000000000',
  fundedAmount: '6840000000',
  progressBps: 6840,
  fundingDeadline: '2026-11-10T00:00:00.000Z',
  daysLeft: 18,
  fundingDeadlinePassed: false,
};

/** The second item of campaigns.md §1: "Room for a forest". */
export const SENGON_ITEM: Json = {
  address: SENGON_CAMPAIGN,
  status: 'funding',
  title: 'Room for a forest',
  species: { code: 'FALCATARIA_FALCATA', name: 'Sengon' },
  region: { name: 'Sukabumi, West Java' },
  treeTarget: 800,
  commitmentUnits: 36,
  fundingTarget: '8000000000',
  fundedAmount: '4200000000',
  progressBps: 5250,
  fundingDeadline: '2026-11-16T00:00:00.000Z',
  daysLeft: 24,
  fundingDeadlinePassed: false,
};

export const item = (changes: Json): Json => ({ ...DEMAK_ITEM, ...changes });

/** A `GET /campaigns` answer. */
export const listOf = (
  items: Json[],
  total = items.length,
  nextCursor: string | null = null,
): Json => ({
  items,
  nextCursor,
  total,
});

/** campaigns.md §3. */
export const SPECIES = {
  items: [
    { code: 'PERSEA_AMERICANA', name: 'Avocado' },
    { code: 'DURIO_ZIBETHINUS', name: 'Durian' },
    { code: 'SWIETENIA_MACROPHYLLA', name: 'Mahogany' },
    { code: 'RHIZOPHORA_MUCRONATA', name: 'Rhizophora mangrove' },
    { code: 'FALCATARIA_FALCATA', name: 'Sengon' },
  ],
  nextCursor: null,
  total: 5,
};

/** campaigns.md §2: the campaign of the example (Demak, Funding). */
export const DEMAK_DETAIL: Json = {
  address: DEMAK,
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
  split: {
    incentivesBps: 7000,
    seedlingsBps: 1000,
    verificationBps: 500,
    reserveBps: 1000,
    feeBps: 500,
  },
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

export const detail = (changes: Json): Json => ({ ...DEMAK_DETAIL, ...changes });

/** "Roots that stay": Active, 984 of 1,200 planted, the claim window still open. */
export const ROOTS_DETAIL: Json = detail({
  address: ROOTS,
  status: 'active',
  title: 'Roots that stay',
  treeTarget: 1200,
  fundedAmount: '18000000000',
  fundingTarget: '18000000000',
  progressBps: 10000,
  daysLeft: null,
  fundingDeadline: '2026-10-01T00:00:00.000Z',
  slots: { anchor: 300, open: 900, planted: 984, openAvailable: 4 },
});

type Account = { role: string; walletAddress: string | null };

const viewerOf = ({ role, walletAddress }: Account, contributedAmount = '0'): Json => ({
  role,
  walletAddress,
  contributedAmount,
  refundedAmount: '0',
  claim: null,
});

/** Alex, the donor of campaigns.md §2, who gave 250 USDC. */
export const ALEX_VIEWER: Json = viewerOf(ALEX, '250000000');

export const RAKA_VIEWER: Json = viewerOf({ role: 'operator', walletAddress: ALEX.walletAddress });

export const DEWI_VIEWER: Json = viewerOf(DEWI);

/** `GET /campaigns/:address`. */
export const campaignBody = (campaign: Json, viewer: Json | null = null): Json => ({
  campaign,
  viewer,
});
