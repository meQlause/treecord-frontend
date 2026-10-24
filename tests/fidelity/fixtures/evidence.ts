// docs/BE/features/evidence.md §4 and evidence-prechecks.md §4: the `GET /evidence/:id` bodies the S21 spec answers with —
// fixture A, the check-in of tree 3104 waiting for an operator (all 14 prechecks pass), and fixture B, the check-in of
// tree 3001 turned back at the prechecks for a 341 m fix.
import { SARI, type MeProfile } from './accounts';
import type { Json } from './campaigns';
import { HELD, ROOTS } from './record';

export const REJECTED = 'a4d7e2c9-81b3-4f6e-b05a-3c9d1e7f2a64';

const DEVICE_KEY = 'x3Jd9kQpT2aBvR7mN4cY8wLs1eFhGz6uK0oPiXjVbQs';
const SHA = 'c81d5e07a3f94b26d0e8c1b7a95f3e420d6b8c1f7a2e9d4053b6c8e1f0a7d293';
const TAG_3104 = 'TC-M3XV-7GPD';

export const OPERATOR: MeProfile = {
  ...SARI,
  id: '3f6b8a21-0d4c-4e97-b1a5-92c7d8e0f413',
  role: 'operator',
  displayName: 'Omar',
};

const row = (check: string, value: string, reason: string | null = null): Json => ({
  check,
  ok: reason === null,
  value,
  limit: null,
  reason,
});

/** The 14 rows of an ALIVE check-in, all passing. */
const ALIVE_ROWS: Json[] = [
  row('device', 'x3Jd9kQpT2…'),
  row('signature', 'ECDSA P-256'),
  row('video_hash', 'c81d5e07a3f9…'),
  row('unique_video', 'unique'),
  row('capture_time', '5 days ago'),
  row('gps_accuracy', '8.4 m'),
  row('location', '3.2 m away'),
  row('duration', '7.0 s'),
  row('ownership', 'yours'),
  row('tree_status', 'alive'),
  row('milestone_window', 'open'),
  row('target_free', 'free'),
  row('challenge', 'none open'),
  row('tag', TAG_3104),
];

const PAYLOAD = {
  v: 1,
  kind: 'ALIVE',
  campaign: ROOTS,
  slotId: null,
  treeId: '3104',
  milestone: 2,
  videoSha256: SHA,
  lat: -7.424298,
  lon: 109.239893,
  acc: 8.4,
  capturedAt: '2026-10-18T07:05:00.000Z',
  challenge: null,
  deviceKey: DEVICE_KEY,
  tag: TAG_3104,
};

/** Fixture A: with the reviewers, liveness borderline. */
export const FIXTURE_A: Json = {
  id: HELD,
  kind: 'ALIVE',
  status: 'needs_review',
  campaign: {
    address: ROOTS,
    title: 'Roots that stay',
    regionName: 'Banyumas',
    regionRadiusM: 2500,
  },
  slotId: null,
  treeId: '3104',
  milestone: 2,
  month: 6,
  capturedAt: '2026-10-18T07:05:00.000Z',
  durationSec: 7,
  videoSha256: SHA,
  payload: PAYLOAD,
  canonical: '{"v":1,"kind":"ALIVE"}',
  signature:
    'WBWKMUG7FQNczeevBYL2rHzwpni-N3gkkRX33NATatyDhUeXWiWERtAZMstCoSeg-x4hAWyGGj1carpIrNSokw',
  precheckResults: ALIVE_ROWS,
  rejectReasons: ['liveness_borderline'],
  policyDecision: 'needs_review',
  policyScore: 8550,
  ai: {
    modelVersion: 'treecord-ai-0.1',
    scores: {
      liveness: 0.75,
      recapture: 0.08,
      treePresence: 0.94,
      growthConsistency: 0.82,
      duplicate: { maxSimilarity: 0.05 },
      challengeVisible: null,
      tagDecoded: TAG_3104,
    },
  },
  keyframes: {
    urls: [0, 1, 2].map((index) => `http://localhost:9000/keyframes/${HELD}/${index}.jpg?sig=x`),
    expiresAt: '2026-10-23T09:27:31.000Z',
  },
  challenge: null,
  review: null,
  pipeline: { step: 3, failedAt: null },
};

/** Fixture B: turned back at the prechecks (341 m), never scored. */
export const FIXTURE_B: Json = {
  ...FIXTURE_A,
  id: REJECTED,
  status: 'rejected',
  treeId: '3001',
  payload: { ...PAYLOAD, treeId: '3001', acc: 341 },
  precheckResults: ALIVE_ROWS.map((entry) =>
    entry.check === 'gps_accuracy' ? row('gps_accuracy', '341.0 m', 'gps_inaccurate') : entry,
  ),
  rejectReasons: ['gps_inaccurate'],
  policyDecision: null,
  policyScore: null,
  ai: null,
  keyframes: null,
  pipeline: { step: 2, failedAt: 'prechecks' },
};

export const evidenceError = (code: string): Json => ({ error: { code, message: code } });
