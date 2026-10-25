// docs/BE/features/audit.md §3: the open session as S24 reads it (sample 3001, 3091, 3104; #3091 `needs_followup` "Flag remains
// open."; challenges R4M9 on #3001 and T2X8 on #3104), and the same session closed (the report hash of the REG-002 vector).
import { CAMPAIGN_ADDRESS, CLOSED_ID, OPEN_ID } from './audit';
import type { Json } from './campaigns';

const REGION = 'East Kalimantan';

const CAMPAIGN = {
  address: CAMPAIGN_ADDRESS,
  title: 'Kalimantan Mangrove Restoration',
  regionName: REGION,
};

const SEED = {
  blockNumber: '17000015',
  blockHash: '0x39e41cfd9e316d39bb6ad8058c9cfbbb2d19fa7938c68e1e32009e56e735a4cd',
  seed: '0x09c2dea7c3ba4fc471025dabff6ef8967bbe0efb0c99a832da02e3e8f0d75778',
};

const challenge = (id: string, code: string): Json => ({
  id,
  code,
  issuedAt: '2026-10-21T04:00:00.000Z',
  expiresAt: '2026-12-20T04:00:00.000Z',
  fulfilledSubmissionId: null,
  status: 'open',
});

/** A sampled tree of the session, with `changes` laid over "no finding, no challenge". */
const sampleOf = (position: number, treeId: string, changes: Json = {}): Json => ({
  position,
  treeId,
  treeStatus: 'alive',
  finding: null,
  notes: null,
  recordedAt: null,
  challenge: null,
  ...changes,
});

const FOLLOW_UP = {
  treeStatus: 'flagged',
  finding: 'needs_followup',
  notes: 'Flag remains open.',
  recordedAt: '2026-10-21T04:12:00.000Z',
};

/** The open session with one finding and two challenges (audit.md §3). */
export const DETAIL: Json = {
  id: OPEN_ID,
  status: 'open',
  campaign: CAMPAIGN,
  seed: SEED,
  population: ['3001', '3020', '3021', '3091', '3092', '3103', '3104'],
  sampleSize: 3,
  samples: [
    sampleOf(0, '3001', { challenge: challenge('4c1f8e2a-7b3d-4e9a-8f6c-2d5e1a9b7c30', 'R4M9') }),
    sampleOf(1, '3091', FOLLOW_UP),
    sampleOf(2, '3104', { challenge: challenge('a87d3b10-5e2c-4f6a-9b1d-3c8e7f2a6d54', 'T2X8') }),
  ],
  findingsRecorded: 1,
  challengesIssued: 2,
  reportHash: null,
  createdAt: '2026-10-21T03:30:00.000Z',
  closedAt: null,
};

/** The same session once all three trees have a finding. */
export const COMPLETE: Json = {
  ...DETAIL,
  samples: [
    sampleOf(0, '3001', { finding: 'ok', notes: 'Planting and month-3 evidence consistent.' }),
    sampleOf(1, '3091', FOLLOW_UP),
    sampleOf(2, '3104', { finding: 'ok', notes: 'Month-6 check-in matches the tag.' }),
  ],
  findingsRecorded: 3,
};

/** The closed session `868c029f-…`. */
export const CLOSED: Json = {
  ...COMPLETE,
  id: CLOSED_ID,
  status: 'closed',
  reportHash: '0x97eb3c933091e9f179119cb8a4396c7301c1ccc911fa4573ccce6ffd1d2c5341',
  closedAt: '2026-10-21T06:00:00.000Z',
};
