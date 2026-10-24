// docs/BE/features/planter.md §1 as S16 reads it: the planter's trees, one page per `nextCursor`, filtered by status, with
// the overview totals and, per tree, the six milestone windows and what may be captured. Private: the key follows the
// account and its wallet (NFR-051). The page decides nothing about eligibility; it shows what `capture` says.
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
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
