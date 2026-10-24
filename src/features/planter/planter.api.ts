// docs/BE/features/planter.md §1 as S16 reads it: the planter's trees, one page per `nextCursor`, filtered by status, with
// the overview totals and, per tree, the six milestone windows and what may be captured. Private: the key follows the
// account and its wallet (NFR-051). The page decides nothing about eligibility; it shows what `capture` says.
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../../app/session/api';
import { useAccountKey } from '../../app/session/use-account-key';

export type TreeStatus = 'alive' | 'flagged' | 'dead' | 'removed' | 'completed';

type MilestoneState = 'paid' | 'open' | 'upcoming' | 'paused' | 'forfeited' | 'missed';

export type TreeMilestone = {
  milestone: number;
  month: number;
  amount: string;
  state: MilestoneState;
  opensAt: string;
  closesAt: string;
};

type Held = { id: string; status: string; month: number; deviceId: string | null };

type Capture = { allowed: boolean; reasons: string[]; held: Held | null };

export type PlanterTree = {
  treeId: string;
  status: TreeStatus;
  campaign: { title: string; regionName: string; speciesName: string };
  replantDeadline: string | null;
  currentMilestone: number | null;
  milestones: TreeMilestone[];
  capture: { ALIVE: Capture; DEAD: Capture; REPLANTED: Capture };
};

export type TreesSummary = {
  treeCount: number;
  survivalPct: number | null;
  flaggedCount: number;
  setAsideAmount: string;
  paidAmount: string;
  openCheckIns: number;
};

export type TreesPage = {
  items: PlanterTree[];
  nextCursor: string | null;
  total: number;
  summary: TreesSummary;
};

/** `GET /planter/trees?status=`, no `limit` (the default 20 is the page); a filter change keeps the cards on screen. */
export const usePlanterTrees = (status: TreeStatus | undefined) => {
  const { ready, key } = useAccountKey();

  return useInfiniteQuery({
    queryKey: ['planter', 'trees', ...key, status],
    queryFn: ({ pageParam, signal }) =>
      api<TreesPage>('/planter/trees', { query: { status, cursor: pageParam }, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    enabled: ready,
  });
};

// ---- GET /api/v1/planter/slots (planter.md §2): bounded, one call, no cursor ----
export type SlotKind = 'open' | 'anchor';

export type PlanterSlot = {
  slotId: string;
  kind: SlotKind;
  status: 'claimed' | 'anchor';
  campaign: {
    address: string;
    title: string;
    regionName: string;
    regionRadiusM: number;
    speciesName: string;
  };
  /** The server issues it on load; `null` is kept for safety, not expected in a 200. */
  tag: { code: string } | null;
};

export const usePlanterSlots = () => {
  const { ready, key } = useAccountKey();

  return useQuery({
    queryKey: ['planter', 'slots', ...key],
    queryFn: ({ signal }) =>
      api<{ items: PlanterSlot[]; total: number }>('/planter/slots', { signal }),
    select: ({ items }) => items,
    enabled: ready,
  });
};

// ---- GET /api/v1/planter/challenges (planter.md §3): open audit challenges on my trees, soonest expiry first ----
export type PlanterChallenge = {
  id: string;
  code: string;
  qr: string;
  issuedAt: string;
  expiresAt: string;
  tree: {
    treeId: string;
    status: TreeStatus;
    tag: string | null;
    month: number;
    campaign: { title: string; regionName: string };
  };
  capture: { allowed: boolean; reasons: string[]; held: { id: string; status: string } | null };
};

export type ChallengesPage = {
  items: PlanterChallenge[];
  nextCursor: string | null;
  total: number;
  summary: { answerable: number };
};

export const usePlanterChallenges = () => {
  const { ready, key } = useAccountKey();

  return useInfiniteQuery({
    queryKey: ['planter', 'challenges', ...key],
    queryFn: ({ pageParam, signal }) =>
      api<ChallengesPage>('/planter/challenges', { query: { cursor: pageParam }, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: ready,
  });
};
