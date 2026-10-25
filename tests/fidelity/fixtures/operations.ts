// docs/BE/features/operations.md §1 and carbon.md §1: the answers the S27 spec serves ("Roots that stay", campaign 0x…03; the
// batch of campaign 0x…06) and the job of a queued write.
import type { Json } from './campaigns';
import { claim } from './job';

export const ROOTS = '0x0000000000000000000000000000000000000003';

export const MANGROVES = '0x0000000000000000000000000000000000000006';

export const JOB = '3b1e0c8a-6f2d-4a9b-8c7e-1d5f4a2b9e60';

/** operations.md §1, with no queued job. */
export const ROOTS_OPS: Json = {
  campaign: {
    address: ROOTS,
    title: 'Roots that stay',
    status: 'active',
    claimDeadline: '2026-05-18T05:00:00.000Z',
  },
  anchor: {
    unassignedAnchorSlots: 300,
    rolledOverOpenSlots: 0,
    queuedSlots: 0,
    availableSlots: 300,
  },
  estimate: {
    method: 'linear-maturity-v1',
    species: { code: 'SWIETENIA_MACROPHYLLA', name: 'Mahogany' },
    treeTarget: 1200,
    removedTrees: 14,
    treeCount: 1186,
    commitmentMonths: 36,
    kgCo2PerYearMature: '30.00',
    yearsToMaturity: 20,
    kgPerTree: '6.75',
    averageMaturityBps: 750,
    previewAmount: '8005',
    label: 'pre-certification',
    current: null,
    locked: false,
  },
  queuedJobs: [],
};

/** The read model with `changes` laid over the named sections. */
export const ops = (changes: { campaign?: Json; anchor?: Json; estimate?: Json } = {}): Json => ({
  ...ROOTS_OPS,
  campaign: { ...(ROOTS_OPS.campaign as Json), ...changes.campaign },
  anchor: { ...(ROOTS_OPS.anchor as Json), ...changes.anchor },
  estimate: { ...(ROOTS_OPS.estimate as Json), ...changes.estimate },
});

/** carbon.md §1's batch 101, as the price tab lists it. */
export const BATCH_101_ITEM: Json = {
  batchId: '101',
  registry: 'SRN PPI',
  vintage: 2025,
  usdcPerTonne: '18500000',
  inventoryAmount: '8400',
};

/** `GET /jobs/:id` for a job of `kind`. */
export const job = (kind: string, status: string, changes: Json = {}): Json =>
  claim({ id: JOB, kind, status, ...changes });

export const FLAG_ID = '1f6c2a9e-4b7d-4e15-9a3c-8d2e5f0b7a61';

export const RESOLVE_JOB = '6e4f2b9d-8a1c-4d3e-b5f7-2c9a0e1d3b84';

/** flags.md §2: the open flag on tree 3091, no resolution queued. */
export const FLAG_OPEN: Json = {
  flag: {
    id: FLAG_ID,
    treeId: '3091',
    status: 'open',
    reasonText: 'Tree condition needs an independent check.',
    reasonHash: '0xc29baac38459527c791a529ef47d1cc43d3734cef04e63520492971274b411cb',
    flaggerAddress: '0x9a4c3e2b1d0f8e7a6c5b4d3e2f1a0b9c8d7e6f5a',
    openedAt: '2026-10-20T09:14:27.000Z',
    openedTxHash: '0x1ce442d81b6082fbb178e08bddf5191b38417d30caae1a738e505a3a3303314c',
    previousStatus: 'alive',
    resolutionNote: null,
    resolvedAt: null,
    resolvedTxHash: null,
  },
  tree: {
    treeId: '3091',
    status: 'flagged',
    campaign: { address: ROOTS, title: 'Roots that stay' },
  },
  resolutionJob: null,
};

/** The flag read with `changes` laid over its parts. */
export const flagWith = (changes: {
  flag?: Json;
  tree?: Json;
  resolutionJob?: Json | null;
}): Json => ({
  flag: { ...(FLAG_OPEN.flag as Json), ...changes.flag },
  tree: { ...(FLAG_OPEN.tree as Json), ...changes.tree },
  resolutionJob: changes.resolutionJob === undefined ? null : changes.resolutionJob,
});

/** The resolution job as flags.md §2 shows it, with `changes`. */
export const resolutionJob = (status: string, changes: Json = {}): Json => ({
  id: RESOLVE_JOB,
  kind: 'resolve_flag',
  status,
  attempts: 1,
  txHash: null,
  lastError: null,
  ...changes,
});
