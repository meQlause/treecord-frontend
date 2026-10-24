// docs/BE/features/planter.md §1: the `GET /api/v1/planter/trees` bodies the S16 spec answers with — Sari's trees on
// "Roots that stay": 3001 alive with milestone 2 open, a held check-in, a flagged tree and a dead one.
import type { Json } from './campaigns';

const WINDOWS = [
  {
    month: 0,
    amount: '1050000',
    opens: '2026-04-18T05:00:00.000Z',
    closes: '2026-05-18T05:00:00.000Z',
  },
  {
    month: 3,
    amount: '1050000',
    opens: '2026-07-17T05:00:00.000Z',
    closes: '2026-08-16T05:00:00.000Z',
  },
  {
    month: 6,
    amount: '1050000',
    opens: '2026-10-15T05:00:00.000Z',
    closes: '2026-11-14T05:00:00.000Z',
  },
  {
    month: 12,
    amount: '1575000',
    opens: '2027-04-13T05:00:00.000Z',
    closes: '2027-05-13T05:00:00.000Z',
  },
  {
    month: 24,
    amount: '1575000',
    opens: '2028-04-07T05:00:00.000Z',
    closes: '2028-05-07T05:00:00.000Z',
  },
  {
    month: 36,
    amount: '4200000',
    opens: '2029-04-02T05:00:00.000Z',
    closes: '2029-05-02T05:00:00.000Z',
  },
];

/** The six windows of planter.md §1, each in the state `states` gives it (`upcoming` when it does not). */
const SCHEDULE = (states: string[]): Json[] =>
  WINDOWS.map(({ month, amount, opens, closes }, milestone) => ({
    milestone,
    month,
    amount,
    state: states[milestone] ?? 'upcoming',
    opensAt: opens,
    closesAt: closes,
  }));

const CAPTURE_ALIVE: Json = {
  ALIVE: { allowed: true, reasons: [], held: null },
  DEAD: { allowed: true, reasons: [], held: null },
  REPLANTED: { allowed: false, reasons: ['wrong_tree_status'], held: null },
};

/** Tree 3001: alive, milestones 0 and 1 paid, milestone 2 open until 14 Nov 2026, a check-in can be recorded. */
export const TREE_3001: Json = {
  treeId: '3001',
  status: 'alive',
  campaign: {
    address: '0x0000000000000000000000000000000000000003',
    title: 'Roots that stay',
    regionName: 'Banyumas, Central Java',
    speciesName: 'Mahogany',
  },
  slotId: '1',
  plantedAt: '2026-04-18T05:00:00.000Z',
  replantDeadline: null,
  tag: 'TC-K7QM-3XRA',
  currentMilestone: 2,
  milestones: SCHEDULE(['paid', 'paid', 'open']),
  capture: CAPTURE_ALIVE,
  openChallenge: null,
};

export const PHONE = 'c2a9f4e1-6b3d-4a7f-9e08-1d5b7c3a2f96';

export const HELD_ID = '5c1e9a7d-3b2f-4e80-9d6a-0f7b2c4e8a13';

/** A tree with its month-6 check-in already submitted from `deviceId`, so no new one can be recorded. */
export const heldTree = (deviceId = PHONE): Json => ({
  ...TREE_3001,
  treeId: '3104',
  capture: {
    ...CAPTURE_ALIVE,
    ALIVE: {
      allowed: false,
      reasons: ['submission_held'],
      held: { id: HELD_ID, status: 'needs_review', month: 6, deviceId },
    },
  },
});

/** A flagged tree at month 6: payouts and the clock are paused. */
export const flaggedTree: Json = {
  ...TREE_3001,
  treeId: '3092',
  status: 'flagged',
  milestones: SCHEDULE(['paid', 'paid', 'paused']),
  capture: {
    ...CAPTURE_ALIVE,
    ALIVE: { allowed: false, reasons: ['tree_flagged'], held: null },
    DEAD: { allowed: false, reasons: ['wrong_tree_status'], held: null },
  },
};

/** A tree that died before its deadline: it can be replanted until `2026-11-04`. */
export const deadTree: Json = {
  ...TREE_3001,
  treeId: '3050',
  status: 'dead',
  replantDeadline: '2026-11-04T05:00:00.000Z',
  currentMilestone: 2,
  milestones: SCHEDULE(['paid', 'paid', 'upcoming']),
  capture: {
    ALIVE: { allowed: false, reasons: ['wrong_tree_status'], held: null },
    DEAD: { allowed: false, reasons: ['wrong_tree_status'], held: null },
    REPLANTED: { allowed: true, reasons: [], held: null },
  },
};

export const SUMMARY: Json = {
  treeCount: 8,
  survivalPct: 62.5,
  flaggedCount: 2,
  setAsideAmount: '84000000',
  paidAmount: '25200000',
  openCheckIns: 2,
};

/** A `GET /planter/trees` answer. */
export const treesOf = (
  items: Json[],
  options: { total?: number; nextCursor?: string | null; summary?: Json } = {},
): Json => ({
  items,
  nextCursor: options.nextCursor ?? null,
  total: options.total ?? items.length,
  summary: options.summary ?? SUMMARY,
  chainTime: '2026-10-23T09:12:31.000Z',
});

const ROOTS_SLOT_CAMPAIGN: Json = {
  address: '0x0000000000000000000000000000000000000003',
  title: 'Roots that stay',
  status: 'active',
  regionName: 'Banyumas, Central Java',
  regionRadiusM: 2500,
  speciesName: 'Mahogany',
};

const SLOT_CAPTURE: Json = { allowed: true, reasons: [], held: null };

/** Slot 41, a claimed open slot with its tag (planter.md §2). */
export const SLOT_41: Json = {
  campaign: ROOTS_SLOT_CAMPAIGN,
  slotId: '41',
  kind: 'open',
  status: 'claimed',
  claimedAt: '2026-10-20T02:11:09.000Z',
  tag: { code: 'TC-B2YK-5ZWN', issuedAt: '2026-10-20T02:14:52.318Z' },
  capture: SLOT_CAPTURE,
};

/** Slot 42, an anchor slot assigned by the operator, with its tag. */
export const SLOT_42: Json = {
  campaign: ROOTS_SLOT_CAMPAIGN,
  slotId: '42',
  kind: 'anchor',
  status: 'anchor',
  claimedAt: '2026-10-20T02:11:09.000Z',
  tag: { code: 'TC-R7DH-8QEX', issuedAt: '2026-10-20T02:14:52.318Z' },
  capture: SLOT_CAPTURE,
};

/** A `GET /planter/slots` answer: bounded, so never a cursor. */
export const slotsOf = (items: Json[]): Json => ({ items, nextCursor: null, total: items.length });
