// docs/BE/features/jobs.md §2: the `GET /api/v1/jobs/:id` bodies the S12 spec answers with.
import type { Json } from './campaigns';

export const CLAIM_ID = '3f2a9c1e-7b4d-4e8a-9c21-5d6f0a8b3e17';

export const FLAG_ID = '5e1d7c3a-9b2f-4a68-8d0e-2c4b6f8a1e93';

export const CAMPAIGN = '0x0000000000000000000000000000000000000003';

const CLAIM_TX = '0x9c4e2a7f1b8d3c6e0f5a9b2d7c4e1f8a3b6d9c2e5f0a7b4d1c8e3f6a9b2d5ce1';

const CLAIM: Json = {
  id: CLAIM_ID,
  kind: 'claim',
  status: 'confirmed',
  attempts: 1,
  txHash: CLAIM_TX,
  createdAt: '2026-10-23T03:02:07.214Z',
  updatedAt: '2026-10-23T03:03:12.889Z',
  context: { campaign: CAMPAIGN, treeId: null, batchId: null, submissionId: null },
};

const FAILED_FLAG: Json = {
  id: FLAG_ID,
  kind: 'resolve_flag',
  status: 'failed',
  attempts: 5,
  txHash: null,
  createdAt: '2026-10-22T09:14:31.560Z',
  updatedAt: '2026-10-22T09:41:05.118Z',
  context: { campaign: CAMPAIGN, treeId: '3091', batchId: null, submissionId: null },
  lastError: 'Worker failure',
};

/** `{ job }` with `changes` laid over Sari's confirmed claim ("Roots that stay"). */
export const claim = (changes: Json = {}): Json => ({ job: { ...CLAIM, ...changes } });

/** `{ job }` with `changes` laid over Raka's failed flag resolution on tree 3091 (the operator's, with `lastError`). */
export const failedFlag = (changes: Json = {}): Json => ({ job: { ...FAILED_FLAG, ...changes } });

/** The same failed flag as anyone but an operator sees it: no `lastError` key at all (NFR-055). */
export const failedFlagForCreator = (): Json => ({
  job: Object.fromEntries(Object.entries(FAILED_FLAG).filter(([key]) => key !== 'lastError')),
});
