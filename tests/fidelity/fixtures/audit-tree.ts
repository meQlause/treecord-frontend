// docs/BE/features/audit.md §4: the evidence bundle of sampled tree #3001 in the open session (PLANTED submission
// 0e6b9f3c-…, policy 9,580, 2 milestones paid, month 6, challenge R4M9 open), and its variants the S25 spec needs.
import { CLOSED_ID, OPEN_ID } from './audit';
import type { Json } from './campaigns';

export const SUBMISSION_ID = '0e6b9f3c-2a71-4d58-b9e4-7c1a5f3d2e80';

const SUBMISSION: Json = {
  id: SUBMISSION_ID,
  kind: 'PLANTED',
  milestone: 0,
  status: 'onchain',
  createdAt: '2026-04-18T05:20:11.204Z',
  precheckResults: [
    { check: 'gps_accuracy', ok: true, value: '8.5 m', limit: '≤ 300 m', reason: null },
  ],
  verification: {
    signatureValid: true,
    canonicalMatchesPayload: true,
    evidenceHashMatches: true,
    videoHashMatches: true,
    recomputedSha256: '9b1c…e3a7',
  },
  device: { id: 'c2a4e6f8-1b3d-4f5a-8c7e-9d0b2a4c6e81', thumbprint: 'NzbLsXh8', revokedAt: null },
  policy: { decision: 'pass', score: 9580, reasons: [] },
  review: null,
  txHash: '0x9f2c',
};

const R4M9: Json = {
  id: '4c1f8e2a-7b3d-4e9a-8f6c-2d5e1a9b7c30',
  code: 'R4M9',
  issuedAt: '2026-10-21T04:00:00.000Z',
  expiresAt: '2026-12-20T04:00:00.000Z',
  fulfilledSubmissionId: null,
  status: 'open',
};

/** Tree #3001 in the open session (position 1 of 3, no finding yet, R4M9 open). */
export const BUNDLE: Json = {
  sessionId: OPEN_ID,
  sessionStatus: 'open',
  sample: {
    position: 0,
    sampleSize: 3,
    treeId: '3001',
    finding: null,
    notes: null,
    recordedAt: null,
  },
  tree: { treeId: '3001', status: 'alive', campaign: '0x0000000000000000000000000000000000000003' },
  progress: { milestonesPaid: 2, month: 6 },
  submissions: [SUBMISSION],
  challenge: R4M9,
  openChallenge: { code: 'R4M9', issuedAt: R4M9.issuedAt, expiresAt: R4M9.expiresAt },
};

/** #3001 after R4M9 expired: no open challenge, so a new one can be issued. */
export const EXPIRED: Json = {
  ...BUNDLE,
  challenge: { ...R4M9, status: 'expired' },
  openChallenge: null,
};

/** #3091: flagged, with the saved follow-up finding and no challenge. */
export const FLAGGED: Json = {
  ...BUNDLE,
  sample: {
    position: 1,
    sampleSize: 3,
    treeId: '3091',
    finding: 'needs_followup',
    notes: 'Flag remains open.',
    recordedAt: '2026-10-21T04:12:00.000Z',
  },
  tree: {
    treeId: '3091',
    status: 'flagged',
    campaign: '0x0000000000000000000000000000000000000003',
  },
  challenge: null,
  openChallenge: null,
};

/** #3001 in the closed session, finding OK. */
export const CLOSED: Json = {
  ...EXPIRED,
  sessionId: CLOSED_ID,
  sessionStatus: 'closed',
  sample: {
    position: 1,
    sampleSize: 2,
    treeId: '3001',
    finding: 'ok',
    notes: 'Planting and month-3 evidence consistent.',
    recordedAt: '2026-10-21T05:20:00.000Z',
  },
};

/** The bundle with its first submission's `verification` overridden. */
export const verifying = (verification: Json, device: Json = {}): Json => ({
  ...BUNDLE,
  submissions: [
    {
      ...SUBMISSION,
      verification: { ...(SUBMISSION.verification as Json), ...verification },
      device: { ...(SUBMISSION.device as Json), ...device },
    },
  ],
});
