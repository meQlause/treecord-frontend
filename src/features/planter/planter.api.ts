// docs/BE/features/planter.md §1 as S16 reads it: the planter's trees, one page per `nextCursor`, filtered by status, with
// the overview totals and, per tree, the six milestone windows and what may be captured. Private: the key follows the
// account and its wallet (NFR-051). The page decides nothing about eligibility; it shows what `capture` says.
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
} from '@tanstack/react-query';
import { useRef } from 'react';
import { api } from '../../app/session/api';
import { useAccountKey } from '../../app/session/use-account-key';
import { FIRST_POLL_MS, pollDelay } from '../accounts/accounts.rules';
import type { CaptureKind } from '../evidence/evidence.rules';

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

// ---- GET /api/v1/planter/uploads (planter.md §4): what I sent, newest first, with where each submission stands ----
export type UploadFilter = 'all' | 'sent' | 'rejected';

type Rejection = {
  stage: 'precheck' | 'operator' | 'policy';
  reasons: { reason: string; value: string | null }[];
  note: string | null;
};

export type UploadItem = {
  id: string;
  kind: CaptureKind;
  month: number | null;
  status: string;
  campaign: { title: string; regionName: string };
  slotId: string | null;
  treeId: string | null;
  capturedAt: string;
  uploadBy: string;
  durationSec: number;
  accM: number | null;
  pipeline: { step: number; failedAt: 'prechecks' | 'scored' | 'attested' | null };
  rejection: Rejection | null;
};

export type UploadsPage = {
  items: UploadItem[];
  nextCursor: string | null;
  total: number;
  summary: { all: number; sent: number; rejected: number };
};

const MOVING = new Set(['checking', 'scored', 'attested']);

/** Is any loaded submission still being carried along (so the list should be asked again)? */
const isMoving = (data: InfiniteData<UploadsPage> | undefined): boolean =>
  data?.pages.some((page) => page.items.some((item) => MOVING.has(item.status))) ?? false;

/**
 * `GET /planter/uploads?filter=`; `enabled` is false for "Waiting", which never asks the server (the cached list still
 * answers). Polls every 2 s, backing off to 5 s while it finds the same list, for as long as an item is moving (NFR-063).
 */
export const usePlanterUploads = (filter: UploadFilter, enabled: boolean) => {
  const { ready, key } = useAccountKey();
  const pace = useRef<{ seen: unknown; delay: number }>({ seen: undefined, delay: FIRST_POLL_MS });

  return useInfiniteQuery({
    queryKey: ['planter', 'uploads', ...key, filter],
    queryFn: ({ pageParam, signal }) =>
      api<UploadsPage>('/planter/uploads', { query: { filter, cursor: pageParam }, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    enabled: ready && enabled,
    refetchInterval: ({ state }) => {
      if (!isMoving(state.data)) {
        return false;
      }

      pace.current = {
        seen: state.data,
        delay: pollDelay(pace.current.delay, state.data !== pace.current.seen),
      };

      return pace.current.delay;
    },
  });
};
