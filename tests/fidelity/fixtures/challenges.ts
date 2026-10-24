// docs/BE/features/planter.md §3: the `GET /api/v1/planter/challenges` bodies the S18 spec answers with — R4M9 on tree
// 3001 (answerable now), T2X8 on tree 3104 (its check-in is already sent), and a challenge on a flagged tree.
import type { Json } from './campaigns';
import { HELD_ID, PHONE } from './planter';

const tree = (treeId: string, tag: string, status = 'alive'): Json => ({
  treeId,
  status,
  tag,
  currentMilestone: 2,
  month: 6,
  campaign: {
    address: '0x0000000000000000000000000000000000000003',
    title: 'Roots that stay',
    regionName: 'Banyumas, Central Java',
  },
});

/** R4M9 on tree 3001: answerable now. */
export const CHALLENGE_R4M9: Json = {
  id: '8f3b2d1e-7a6c-4e95-b0d4-2c1a9e8f7b63',
  code: 'R4M9',
  qr: 'TCH-R4M9',
  issuedAt: '2026-10-21T04:00:00.000Z',
  expiresAt: '2026-12-20T04:00:00.000Z',
  tree: tree('3001', 'TC-K7QM-3XRA'),
  capture: { allowed: true, reasons: [], held: null },
};

/** T2X8 on tree 3104: the month-6 check-in is already sent and waits for review. */
export const CHALLENGE_T2X8: Json = {
  id: '1d7e4c2a-9b5f-4a83-8e60-3f2b1c9d7a45',
  code: 'T2X8',
  qr: 'TCH-T2X8',
  issuedAt: '2026-10-21T04:00:00.000Z',
  expiresAt: '2026-12-20T04:00:00.000Z',
  tree: tree('3104', 'TC-M3XV-7GPD'),
  capture: {
    allowed: false,
    reasons: ['milestone_already_done'],
    held: { id: HELD_ID, status: 'needs_review', milestone: 2, month: 6, deviceId: PHONE },
  },
};

/** A challenge whose tree is flagged: it cannot be answered while the tree is paused. */
export const CHALLENGE_FLAGGED: Json = {
  ...CHALLENGE_R4M9,
  id: '4a9c1e7b-2d3f-4b58-9a61-7e0c5d2b8f14',
  code: 'F9K3',
  qr: 'TCH-F9K3',
  tree: tree('3092', 'TC-P5NW-2HQT', 'flagged'),
  capture: { allowed: false, reasons: ['wrong_tree_status'], held: null },
};

/** A `GET /planter/challenges` answer; `answerable` counts the open challenges that can be answered now. */
export const challengesOf = (
  items: Json[],
  options: { answerable?: number; nextCursor?: string | null } = {},
): Json => ({
  items,
  nextCursor: options.nextCursor ?? null,
  total: items.length,
  summary: { answerable: options.answerable ?? 1 },
});
