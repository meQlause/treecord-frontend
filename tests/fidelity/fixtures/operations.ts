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
