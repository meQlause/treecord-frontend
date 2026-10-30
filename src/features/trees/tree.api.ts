// trees.md §1: one tree with everything S05 renders. Public; signed in, the bearer token is sent and the answer adds
// `viewer` and, for permitted readers, the exact location. The cache key follows the account so one person's data is
// never shown to another (NFR-051).
import { useQuery } from '@tanstack/react-query';
import { api } from '../../app/session/api';
import { config } from '../../app/session/config';
import { useSession } from '../../app/session/session';
import { isTreeId } from './tree.rules';

export type TreeStatus = 'alive' | 'flagged' | 'dead' | 'removed' | 'completed';

type Evidence = { month: number; score: number; thumbnailUrl: string | null };

export type TimelineEvent = {
  kind: string;
  at: string;
  txHash: string;
  evidenceHash: string | null;
  evidence: Evidence | null;
};

export type Milestone = {
  month: number;
  opensAt: string;
  closesAt: string;
  amount: string | null;
  status: string;
  /** FR-244: the Chainlink keeper's forfeit transaction, else null. */
  enforcedTxHash: string | null;
};

export type Flag = {
  id: string;
  status: string;
  reasonText: string;
  resolutionNote: string | null;
};

export type LiveSubmission = { id: string; kind: string; month: number; status: string };

type Viewer = {
  isPlanter: boolean;
  liveSubmissions: LiveSubmission[];
  flag: { eligible: boolean; blockedBy: string | null };
  pendingFlag: { reasonText: string; reasonHash: string } | null;
};

export type TreeDetail = {
  tree: {
    treeId: string;
    status: TreeStatus;
    campaign: {
      address: string;
      title: string | null;
      species: { code: string; name: string };
      region: { name: string };
    };
    plantedAt: string;
    location: { precision: 'exact' | 'geohash'; lat: number; lon: number };
    tag: string | null;
    replantDeadline: string | null;
    /** FR-244: the Chainlink keeper's expire transaction, else null. */
    removalEnforcedTxHash: string | null;
  };
  timeline: TimelineEvent[];
  milestones: Milestone[];
  payouts: { planterAddress: string; txHash: string }[];
  forfeits: unknown[];
  summary: {
    milestonesPaid: number;
    paidAmount: string;
    perTreeIncentive: string | null;
    currentMonth: number;
  };
  flags: Flag[];
  viewer: Viewer | null;
};

/** T-1…T-11. A malformed id is not found at once, without a request (s05 §2). */
export function useTree(treeId: string) {
  const session = useSession();
  const profile = session.phase === 'ready' ? session.profile : null;
  const key =
    profile === null
      ? ['public', 'tree', treeId]
      : ['tree', treeId, profile.id, profile.walletAddress, config().chainId];

  return useQuery({
    queryKey: key,
    enabled: isTreeId(treeId) && session.phase !== 'resolving',
    // the page and the D07 flag form share this read: a form that mounts later must not read the tree again
    // (as `useMe`: refetched on focus and by the form's own refetch, not by every component that mounts and asks)
    refetchOnMount: false,
    queryFn: ({ signal }) => api<TreeDetail>(`/trees/${treeId}`, { signal }),
  });
}
