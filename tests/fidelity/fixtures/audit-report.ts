// docs/BE/features/audit.md §7-§9: the closed session's report as D13 returns it and S26 reads it (`868c029f-…`, sample 3091 and
// 3001, report hash 0x97eb…5341), the open session's "not closed" report, and the public reproduction S10 reads.
import { CAMPAIGN_ADDRESS, CLOSED_ID, OPEN_ID } from './audit';
import type { Json } from './campaigns';

const CAMPAIGN = { address: CAMPAIGN_ADDRESS, title: 'Kalimantan Mangrove Restoration' };

export const REPORT_HASH = '0x97eb3c933091e9f179119cb8a4396c7301c1ccc911fa4573ccce6ffd1d2c5341';

export const NOTES_HASH = '0x60b1ce72a79120a3d943e93d68c5cfbaa7e5b98b99114469896c74f4da14d545';

export const SUMMARY =
  'Sample reviewed; one tree needs follow-up while its flag is resolved. No registry certification is implied.';

const ALGORITHM =
  'seed = keccak256(utf8(sessionId) ++ blockHash). Sort the population ascending. For i from n-1 down to 1: r = uint256(keccak256(seed ++ uint256(i))), j = r mod (i + 1), swap items i and j. The sample is the first sampleSize items.';

/** The `report` object of audit.md §7, whose canonical JSON hashes to `REPORT_HASH` (REG-002). */
export const REPORT: Json = {
  version: 1,
  sessionId: CLOSED_ID,
  campaign: CAMPAIGN_ADDRESS,
  auditor: {
    profileId: '5f0c2a9e-8d41-4b7a-9c3e-1a6d2f8b4e70',
    wallet: '0x2a7f3c9e1b5d8f0a4c6e2b9d7f1a3c5e8b0d2f4a',
  },
  seed: {
    blockNumber: '17000001',
    blockHash: '0xd0e38899a3d5c3657e22f95fdada4f0da6aa36ea51545d334455da8663d50701',
    seed: '0x791f45521e15b6066b8e598549c8dd5f59d9283ffe919c1cb3418767d3534c49',
    algorithm: ALGORITHM,
  },
  population: ['3001', '3020', '3021', '3091', '3092', '3103', '3104'],
  sampleSize: 2,
  findings: [
    {
      position: 0,
      treeId: '3091',
      finding: 'needs_followup',
      recordedAt: '2026-10-21T05:40:00.000Z',
    },
    { position: 1, treeId: '3001', finding: 'ok', recordedAt: '2026-10-21T05:20:00.000Z' },
  ],
  totals: { ok: 1, issue: 0, needsFollowup: 1 },
  challenges: [],
  notesHash: NOTES_HASH,
  closedAt: '2026-10-21T06:00:00.000Z',
};

/** The owner's private notes (`GET …/report` and the close answer only). */
export const NOTES: Json = {
  salt: '0x5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a',
  findings: [
    { position: 0, notes: 'Flag remains open.' },
    { position: 1, notes: 'Planting and month-3 evidence consistent.' },
  ],
  summary: SUMMARY,
};

/** audit.md §7: the answer to a close, and the closed session's `GET …/report`. */
export const CLOSE_BODY: Json = {
  sessionId: CLOSED_ID,
  status: 'closed',
  closedAt: '2026-10-21T06:00:00.000Z',
  campaign: CAMPAIGN,
  reportHash: REPORT_HASH,
  report: REPORT,
  notes: NOTES,
};

/** audit.md §8: the open session's report, "not closed". */
export const NOT_CLOSED: Json = {
  sessionId: OPEN_ID,
  status: 'open',
  closedAt: null,
  campaign: CAMPAIGN,
  reportHash: null,
  report: null,
  notes: null,
};
