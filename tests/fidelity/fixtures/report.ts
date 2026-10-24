// docs/BE/features/reports.md §1 and §2: the bodies the S06 specs answer with.
export const ADDRESS = '0x0000000000000000000000000000000000000003';

export const UNKNOWN_ADDRESS = '0x00000000000000000000000000000000000000ff';

const EVIDENCE = [
  {
    treeId: '3001',
    kind: 'planted',
    milestone: 0,
    month: 0,
    at: '2026-04-18T05:00:00.000Z',
    evidenceHash: '0x70e975f0bb53d200bfa7a1d9aa946ac692f54c6f60a59d4c08377fd9b5010ba8',
    blockNumber: '24118402',
    txHash: '0x701b0abfeea3fecb2a3c5eeca4be4db1ddf9c6a34a3a995d5259f210ed21397f',
  },
  {
    treeId: '3002',
    kind: 'check_in',
    milestone: 1,
    month: 3,
    at: '2026-07-20T05:00:00.000Z',
    evidenceHash: '0x2903d8f5241e15d014d926e0f87116581e691ed91f9d3236d5de7ed3b09e513e',
    blockNumber: '28136002',
    txHash: '0xfc1aa44341c8f43ddcb5395ad09f71054cb5e8c40396b51a98ae4a454b215eed',
  },
  {
    treeId: '3003',
    kind: 'check_in',
    milestone: 2,
    month: 6,
    at: '2026-10-18T05:00:00.000Z',
    evidenceHash: '0xed13c09c23e60389c349d99219df3f7ad9dbed132a97c372c1a6b70a63bf19ad',
    blockNumber: '32024002',
    txHash: '0x7f7a42c33188c857a93e22dabf6681b1d1d4ebe5235f700ee202241b4ee3ba3d',
  },
];

const MILESTONES = [
  { milestone: 0, month: 0, payouts: 984, amount: '1033200000' },
  { milestone: 1, month: 3, payouts: 984, amount: '1033200000' },
  { milestone: 2, month: 6, payouts: 32, amount: '33600000' },
  { milestone: 3, month: 12, payouts: 0, amount: '0' },
  { milestone: 4, month: 24, payouts: 0, amount: '0' },
  { milestone: 5, month: 36, payouts: 0, amount: '0' },
];

/** "Roots that stay" (reports.md §1). */
export const REPORT = {
  generatedAt: '2026-10-21T05:00:00.000Z',
  campaign: {
    address: ADDRESS,
    status: 'active',
    title: 'Roots that stay',
    species: { code: 'SWIETENIA_MACROPHYLLA', name: 'Mahogany' },
    region: { name: 'Banyumas, Central Java', radiusM: 2500 },
    treeTarget: 1200,
    commitmentUnits: 36,
  },
  trees: {
    planted: 984,
    alive: 948,
    flagged: 2,
    dead: 20,
    removed: 14,
    completed: 0,
    survivalRateBps: 9654,
    averageAgeDays: 186,
  },
  funding: {
    fundingTarget: '18000000000',
    fundedAmount: '18000000000',
    progressBps: 10000,
    contributors: 120,
    refundedAmount: '0',
  },
  incentives: {
    incentivePool: '12600000000',
    paidAmount: '2100000000',
    paidBps: 1666,
    forfeitedAmount: '68000000',
    byMilestone: MILESTONES,
  },
  carbon: {
    estimate: { label: 'pre-certification', estimatedAmount: '8005', method: null },
    issued: { label: 'issued', issuedAmount: '0', retiredAmount: '0', batches: [] },
  },
  evidence: { items: EVIDENCE, nextCursor: null, total: 3 },
};

/** The carbon block of "Back to the mangroves" (reports.md §1). */
export const MANGROVES_CARBON = {
  estimate: { label: 'pre-certification', estimatedAmount: '20000', method: null },
  issued: {
    label: 'issued',
    issuedAmount: '22000',
    retiredAmount: '400',
    batches: [
      {
        batchId: '101',
        registry: 'SRN PPI',
        vintage: 2025,
        serialStart: 'SRN-2025-00001',
        serialEnd: 'SRN-2025-16000',
        issuedAmount: '16000',
        issuedTxHash: '0xf1295876f501f93023aaf30204d5604394b4c7b7dd59fc4e451dafcd3dfe67a0',
      },
      {
        batchId: '103',
        registry: 'SRN PPI',
        vintage: 2024,
        serialStart: 'SRN-2024-00001',
        serialEnd: 'SRN-2024-06000',
        issuedAmount: '6000',
        issuedTxHash: '0x3ba98bd5818a98e741d44cf260e44db09cf49f483df10f737982a67a0abeb208',
      },
    ],
  },
};

/** A Funding campaign: nothing planted, no payouts, no evidence (S06 criterion 10). */
export const FUNDING_REPORT = {
  ...REPORT,
  campaign: { ...REPORT.campaign, status: 'funding' },
  trees: {
    planted: 0,
    alive: 0,
    flagged: 0,
    dead: 0,
    removed: 0,
    completed: 0,
    survivalRateBps: null,
    averageAgeDays: null,
  },
  incentives: {
    ...REPORT.incentives,
    paidAmount: '0',
    paidBps: 0,
    forfeitedAmount: '0',
    byMilestone: MILESTONES.map((row) => ({ ...row, payouts: 0, amount: '0' })),
  },
  evidence: { items: [], nextCursor: null, total: 0 },
};

/** Page one holds the first record and a cursor; the second page is reports.md §2 (E-4). */
export const CURSOR = 'eyJiIjoiMjQxMTg0MDIiLCJsIjozfQ';

export const FIRST_PAGE = { items: EVIDENCE.slice(0, 1), nextCursor: CURSOR, total: 3 };

export const SECOND_PAGE = { items: EVIDENCE.slice(1), nextCursor: null, total: 3 };
