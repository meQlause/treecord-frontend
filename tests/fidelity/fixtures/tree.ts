// docs/BE/features/trees.md §1 and flags.md §1: the `GET /api/v1/trees/:treeId` bodies the S05 specs answer with.
const CAMPAIGN = {
  address: '0x0000000000000000000000000000000000000003',
  title: 'Roots that stay',
  species: { code: 'SWIETENIA_MACROPHYLLA', name: 'Mahogany' },
  region: { name: 'Banyumas, Central Java' },
};

const PLANTER = '0x4b9e2f1a7c3d05e6f8a91b2c3d4e5f6a7b8c9d0e';
const PLANTED_TX = '0x701b0abfeea3fecb2a3c5eeca4be4db1ddf9c6a34a3a995d5259f210ed21397f';
const CHECK_IN_TX = '0xfc1aa44341c8f43ddcb5395ad09f71054cb5e8c40396b51a98ae4a454b215eed';

const THUMB = 'http://localhost:9000/keyframes/5e3a8c1d-2b4f-4d6e-9a7c-1f0b3e5d7c92/0.jpg';

const TIMELINE = [
  {
    kind: 'planted',
    at: '2026-04-18T05:00:00.000Z',
    blockNumber: '24118402',
    txHash: PLANTED_TX,
    evidenceHash: '0x70e975f0bb53d200bfa7a1d9aa946ac692f54c6f60a59d4c08377fd9b5010ba8',
    evidence: { kind: 'PLANTED', milestone: 0, month: 0, score: 9580, thumbnailUrl: THUMB },
  },
  {
    kind: 'check_in',
    at: '2026-07-20T05:00:00.000Z',
    blockNumber: '28136002',
    txHash: CHECK_IN_TX,
    evidenceHash: '0x2903d8f5241e15d014d926e0f87116581e691ed91f9d3236d5de7ed3b09e513e',
    evidence: { kind: 'ALIVE', milestone: 1, month: 3, score: 9230, thumbnailUrl: THUMB },
  },
];

const WINDOWS = [
  ['2026-04-18T05:00:00.000Z', '2026-05-18T05:00:00.000Z', '1050000'],
  ['2026-07-17T05:00:00.000Z', '2026-08-16T05:00:00.000Z', '1050000'],
  ['2026-10-15T05:00:00.000Z', '2026-11-14T05:00:00.000Z', '1050000'],
  ['2027-04-13T05:00:00.000Z', '2027-05-13T05:00:00.000Z', '1575000'],
  ['2028-04-07T05:00:00.000Z', '2028-05-07T05:00:00.000Z', '1575000'],
  ['2029-04-02T05:00:00.000Z', '2029-05-02T05:00:00.000Z', '4200000'],
];

const MONTHS = [0, 3, 6, 12, 24, 36];

/** The six milestones with the given statuses, in order. */
const milestones = (statuses: readonly string[]) =>
  WINDOWS.map(([opensAt, closesAt, amount], index) => ({
    milestone: index,
    month: MONTHS[index],
    opensAt,
    closesAt,
    amount,
    status: statuses[index],
  }));

const PAYOUTS = [
  { milestone: 0, month: 0, amount: '1050000', planterAddress: PLANTER, txHash: PLANTED_TX },
  { milestone: 1, month: 3, amount: '1050000', planterAddress: PLANTER, txHash: CHECK_IN_TX },
].map((payout) => ({ ...payout, at: '2026-07-20T05:00:00.000Z' }));

/** Tree 3001 of "Roots that stay", signed out (trees.md §1). */
export const TREE_3001 = {
  tree: {
    treeId: '3001',
    status: 'alive',
    campaign: CAMPAIGN,
    slotId: 1,
    planterAddress: PLANTER,
    plantedAt: '2026-04-18T05:00:00.000Z',
    plantedTxHash: PLANTED_TX,
    location: { precision: 'geohash', lat: -7.431564, lon: 109.24736, geohash: 'qqtttzp' },
    tag: 'TC-K7QM-3XRA',
    replantDeadline: null as string | null,
  },
  timeline: TIMELINE,
  milestones: milestones(['paid', 'paid', 'open', 'upcoming', 'upcoming', 'upcoming']),
  payouts: PAYOUTS,
  forfeits: [] as unknown[],
  summary: {
    milestonesPaid: 2,
    paidAmount: '2100000',
    perTreeIncentive: '10500000',
    currentMilestone: 2,
    currentMonth: 6,
  },
  flags: [] as unknown[],
  viewer: null as unknown,
};

const NOT_CONTRIBUTOR = { eligible: false, blockedBy: 'not_contributor' };

const viewer = (changes: object = {}) => ({
  isPlanter: false,
  liveSubmissions: [],
  flag: { eligible: false, blockedBy: 'not_contributor' },
  pendingFlag: null,
  ...changes,
});

/** The planter (Sari) sees the exact location (trees.md "Viewer variants"). */
export const SARI_3001 = {
  ...TREE_3001,
  tree: {
    ...TREE_3001.tree,
    location: { precision: 'exact', lat: -7.431205, lon: 109.247813, geohash: 'qqtttzp' },
  },
  viewer: viewer({ isPlanter: true, flag: NOT_CONTRIBUTOR }),
};

/** Sari on tree 3104, whose month-6 check-in is in review. */
export const SARI_3104 = {
  ...SARI_3001,
  tree: { ...SARI_3001.tree, treeId: '3104' },
  viewer: viewer({
    isPlanter: true,
    flag: NOT_CONTRIBUTOR,
    liveSubmissions: [
      {
        id: '9c2b7e4a-3d1f-4a8e-b6c5-0f9e8d7a6b53',
        kind: 'ALIVE',
        milestone: 2,
        month: 6,
        status: 'needs_review',
      },
    ],
  }),
};

/** Alex (a contributor) on tree 3103, where he saved a reason but has not sent the wallet transaction. */
export const ALEX_3103 = {
  ...TREE_3001,
  tree: { ...TREE_3001.tree, treeId: '3103' },
  viewer: viewer({
    flag: { eligible: true, blockedBy: null },
    pendingFlag: {
      id: '3b9e4c1a-6d9f-4a37-9c5e-af4a7b2d9c83',
      reasonText: 'Reason saved; wallet transaction has not been confirmed.',
      reasonHash: '0x9688db7d3b60f2367d5bf0744016362a7b8a3fcf9cd633b1ac9f66c26c51e250',
      createdAt: '2026-10-22T08:41:09.330Z',
    },
  }),
};

/** Tree 3091, flagged at month 6, with its open flag (trees.md "Tree 3091"). */
export const TREE_3091 = {
  ...TREE_3001,
  tree: { ...TREE_3001.tree, treeId: '3091', status: 'flagged' },
  milestones: milestones(['paid', 'paid', 'paused', 'paused', 'paused', 'paused']),
  flags: [
    {
      id: '1f6c2a9e-4b7d-4e15-9a3c-8d2e5f0b7a61',
      status: 'open',
      reasonText: 'Tree condition needs an independent check.',
      reasonHash: '0xc29baac38459527c791a529ef47d1cc43d3734cef04e63520492971274b411cb',
      resolutionNote: null,
      openedAt: '2026-10-20T09:14:27.000Z',
      openedTxHash: '0x1ce442d81b6082fbb178e08bddf5191b38417d30caae1a738e505a3a3303314c',
      resolvedAt: null,
      resolvedTxHash: null,
    },
  ],
  viewer: viewer({ flag: { eligible: false, blockedBy: 'tree_not_flaggable' } }),
};

/** Tree 3021, removed: every unpaid milestone is forfeited (FR-056 #3). */
export const TREE_3021 = {
  ...TREE_3001,
  tree: { ...TREE_3001.tree, treeId: '3021', status: 'removed' },
  milestones: milestones(['paid', 'paid', 'forfeited', 'forfeited', 'forfeited', 'forfeited']),
};

/** A dead tree with a replant deadline (FR-052 #1). */
export const DEAD_TREE = {
  ...TREE_3001,
  tree: {
    ...TREE_3001.tree,
    treeId: '3050',
    status: 'dead',
    replantDeadline: '2026-11-04T05:00:00.000Z',
  },
};

export const EMPTY_TIMELINE = { ...TREE_3001, timeline: [] };
