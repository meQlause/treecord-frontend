// The reads and the one write helper of S27–S29 (operations.md §1–§5, evidence.md §4, flags.md §2, carbon.md §1). Every key
// carries account, wallet and chain; a read waits for the profile, so one account's data never lands under another's.
import { useQuery } from '@tanstack/react-query';
import { api } from '../../app/session/api';
import { useAccountKey } from '../../app/session/use-account-key';
import type { JobStatus } from '../accounts/accounts.rules';

const POLL_MS = 3000;

// shortcut: a fixed 3 s poll while something is queued, not the 2→5 s backoff of useJob; upgrade if it loads the API
const whileQueued = (waiting: boolean | undefined): number | false =>
  waiting === true ? POLL_MS : false;

type Status = 'funding' | 'active' | 'refunding' | 'completed';

type QueuedJob = { id: string; kind: string; status: JobStatus };

export type OperatorCampaign = {
  campaign: { address: string; title: string; status: Status };
  anchor: { availableSlots: number; rolledOverOpenSlots: number | null };
  estimate: {
    method: string;
    species: { name: string } | null;
    treeCount: number;
    commitmentMonths: number;
    kgCo2PerYearMature: string | null;
    yearsToMaturity: number | null;
    kgPerTree: string | null;
    averageMaturityBps: number | null;
    current: { amount: string; label: string } | null;
    locked: boolean;
  };
  queuedJobs: QueuedJob[];
};

export function useOperatorCampaign(address: string, enabled: boolean) {
  const { ready, key } = useAccountKey();

  return useQuery({
    queryKey: [...key, 'operator', 'campaign', address],
    enabled: ready && enabled,
    queryFn: ({ signal }) => api<OperatorCampaign>(`/operator/campaigns/${address}`, { signal }),
    refetchInterval: ({ state }) => whileQueued((state.data?.queuedJobs.length ?? 0) > 0),
  });
}

export type Batch = {
  batchId: string;
  registry: string;
  vintage: number;
  usdcPerTonne: string | null;
  inventoryAmount: string;
};

/** `GET /carbon/batches?campaign=…&limit=100`; `nextCursor` is ignored (one page of 100, ponytail: s27 §2.2). */
export function useCampaignBatches(address: string) {
  const { ready, key } = useAccountKey();

  return useQuery({
    queryKey: [...key, 'operator', 'batches', address],
    enabled: ready,
    queryFn: ({ signal }) =>
      api<{ items: Batch[] }>('/carbon/batches', {
        query: { campaign: address, limit: 100 },
        signal,
      }),
    select: ({ items }) => items,
  });
}

export type Evidence = {
  id: string;
  status: string;
  treeId: string | null;
  slotId: string;
  kind: string;
  month: number | null;
  policyDecision: string | null;
  policyScore: number | null;
  payload: { tag: string | null } | null;
  ai: {
    modelVersion: string | null;
    scores: {
      liveness: number | null;
      treePresence: number | null;
      recapture: number | null;
      growthConsistency: number | null;
      tagDecoded: string | null;
      duplicate: { maxSimilarity: number | null } | null;
    } | null;
  } | null;
  rejectReasons: string[];
  review: { note: string | null } | null;
  jobId: string | null;
};

const WATCHED = new Set(['checking', 'attested']);

export function useEvidence(id: string, enabled: boolean) {
  const { ready, key } = useAccountKey();

  return useQuery({
    queryKey: [...key, 'operator', 'evidence', id],
    enabled: ready && enabled,
    queryFn: ({ signal }) => api<Evidence>(`/evidence/${id}`, { signal }),
    refetchInterval: ({ state }) => whileQueued(WATCHED.has(state.data?.status ?? '')),
  });
}

export type FlagRead = {
  flag: {
    id: string;
    treeId: string;
    status: string;
    reasonText: string;
    openedAt: string | null;
    reasonHash: string | null;
    flaggerAddress: string | null;
    previousStatus: string | null;
    resolutionNote: string | null;
  };
  tree: { status: string; campaign: { title: string } };
  resolutionJob: { id: string; status: JobStatus; lastError?: string | null } | null;
};

const IN_FLIGHT = new Set(['pending', 'processing', 'sent', 'confirmed']);

export function useFlagRead(treeId: string, flagId: string, enabled: boolean) {
  const { ready, key } = useAccountKey();

  return useQuery({
    queryKey: [...key, 'operator', 'flag', treeId, flagId],
    enabled: ready && enabled,
    queryFn: ({ signal }) => api<FlagRead>(`/operator/trees/${treeId}/flags/${flagId}`, { signal }),
    refetchInterval: ({ state }) =>
      whileQueued(
        state.data?.flag.status === 'open' && IN_FLIGHT.has(state.data.resolutionJob?.status ?? ''),
      ),
  });
}

/** One write: `202 { job }` or `200 { job }`; `key` is the Idempotency-Key when the endpoint takes one. */
export const post = <T = { job: { id: string } }>(
  path: string,
  body: object,
  key?: string,
): Promise<T> =>
  api<T>(path, { method: 'POST', body, ...(key === undefined ? {} : { idempotencyKey: key }) });
