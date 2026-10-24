// docs/BE/features/planter.md §4: the `GET /planter/uploads` bodies the S20 spec answers with — a recording waiting on this
// phone (the one local row), a submission in review, a rejected one and a planting that landed on-chain.
import { SARI } from './accounts';
import type { Json } from './campaigns';
import { HELD, ROOTS, TAG } from './record';

const CAMPAIGN = { address: ROOTS, title: 'Roots that stay', regionName: 'Banyumas, Central Java' };

const PHONE = 'c2a9f4e1-6b3d-4a7f-9e08-1d5b7c3a2f96';

export const REJECTED_ID = 'a4d7e2c9-81b3-4f6e-b05a-3c9d1e7f2a64';

const PLANTED_ID = 'e3f8b1a6-27c4-4d9e-8a50-6b1f0c3d9e72';

/** Tree 3104, month 6: with the reviewers. */
export const NEEDS_REVIEW: Json = {
  id: HELD,
  kind: 'ALIVE',
  milestone: 2,
  month: 6,
  status: 'needs_review',
  campaign: CAMPAIGN,
  slotId: null,
  treeId: '3104',
  capturedAt: '2026-10-18T07:05:00.000Z',
  uploadBy: '2026-10-21T07:05:00.000Z',
  durationSec: 7,
  accM: 8.4,
  deviceId: PHONE,
  pipeline: { step: 3, failedAt: null },
  rejection: null,
};

/** Tree 3001: turned back at the prechecks for a 341 m fix. */
export const REJECTED: Json = {
  ...NEEDS_REVIEW,
  id: REJECTED_ID,
  status: 'rejected',
  treeId: '3001',
  capturedAt: '2026-10-17T06:40:00.000Z',
  uploadBy: '2026-10-20T06:40:00.000Z',
  durationSec: 6,
  accM: 341.0,
  pipeline: { step: 2, failedAt: 'prechecks' },
  rejection: {
    stage: 'precheck',
    reasons: [{ reason: 'gps_inaccurate', value: '341.0 m' }],
    note: null,
  },
};

/** Slot 1, planted: its tree is 3001 now. */
export const ONCHAIN: Json = {
  ...NEEDS_REVIEW,
  id: PLANTED_ID,
  kind: 'PLANTED',
  milestone: 0,
  month: 0,
  status: 'onchain',
  slotId: '1',
  treeId: '3001',
  capturedAt: '2026-04-18T05:12:00.000Z',
  uploadBy: '2026-04-21T05:12:00.000Z',
  durationSec: 8,
  accM: 6.2,
  pipeline: { step: 5, failedAt: null },
};

/** The submission the local row becomes once it is sent. */
export const CHECKING: Json = {
  ...NEEDS_REVIEW,
  id: '7d5c9b8e-1f4a-4c2e-9a3b-6f0e2d1c4b5a',
  treeId: '3001',
  status: 'checking',
  capturedAt: '2026-10-23T09:14:05.000Z',
  uploadBy: '2026-10-26T09:14:05.000Z',
  durationSec: 7.2,
  pipeline: { step: 2, failedAt: null },
};

/** `rejected` with `stale_capture`, as a submit 422 leaves it. */
export const STALE: Json = {
  ...CHECKING,
  status: 'rejected',
  pipeline: { step: 2, failedAt: 'prechecks' },
  rejection: {
    stage: 'precheck',
    reasons: [{ reason: 'stale_capture', value: '80.0 h' }],
    note: null,
  },
};

export const SUMMARY_3 = { all: 3, sent: 2, rejected: 1 };

/** A `GET /planter/uploads` answer. */
export const uploadsOf = (
  items: Json[],
  summary: { all: number; sent: number; rejected: number } = SUMMARY_3,
): Json => ({ items, nextCursor: null, total: items.length, summary });

/** The row the queue holds for this phone: ALIVE, tree 3001, month 6, 7.2 s, ±8.4 m. */
export const LOCAL_ROW = {
  id: 'local-1',
  profileId: SARI.id,
  submissionId: null,
  kind: 'ALIVE',
  campaign: CAMPAIGN,
  slotId: null,
  treeId: '3001',
  milestone: 2,
  month: 6,
  durationSec: 7.2,
  sizeBytes: 4,
  contentType: 'video/webm',
  capturedAt: '2026-10-23T09:14:05.000Z',
  payload: {
    v: 1,
    kind: 'ALIVE',
    campaign: ROOTS,
    slotId: null,
    treeId: '3001',
    milestone: 2,
    videoSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    lat: -7.42431,
    lon: 109.23987,
    acc: 8.4,
    capturedAt: '2026-10-23T09:14:05.000Z',
    challenge: 'R4M9',
    deviceKey: 'x3Jd9kQpT2aBvR7mN4cY8wLs1eFhGz6uK0oPiXjVbQs',
    tag: TAG,
  },
  canonical: '{"v":1}',
  signature: 'A'.repeat(86),
};
