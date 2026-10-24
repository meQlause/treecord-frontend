// docs/BE/features/donor.md §1-§2 as S13 reads them: the dashboard (totals, carbon, flags) and the campaign cards, one
// page per `nextCursor`, filtered by the status tab. Both are private: the keys follow the account and its wallet, so
// one person's home never reaches another (NFR-051).
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../../app/session/api';
import { useAccountKey } from '../../app/session/use-account-key';

export type DonorFlag = {
  id: string;
  treeId: string;
  campaign: { address: string; title: string | null };
  status: 'open' | 'pending';
  reasonText: string;
};

export type Dashboard = {
  totals: {
    campaigns: number;
    contributedAmount: string;
    payoutsReleased: string;
    treesPlanted: number;
    survivalRateBps: number | null;
    openFlags: number;
  };
  carbon: {
    issued: { issuedAmount: string; allocatedAmount: string };
    unfilled: { unfilledAmount: string };
  };
  flags: { open: number; pending: number; total: number; items: DonorFlag[] };
};

export type TreeCounts = {
  planted: number;
  alive: number;
  flagged: number;
  dead: number;
  removed: number;
  completed: number;
};

export type DonorCard = {
  campaign: {
    address: string;
    status: 'funding' | 'active' | 'refunding' | 'completed';
    title: string | null;
    species: { code: string; name: string } | null;
    region: { name: string } | null;
    treeTarget: number;
    fundingTarget: string;
    fundedAmount: string;
    progressBps: number;
  };
  contributedAmount: string;
  fundingShareBps: number | null;
  refundedAmount: string;
  trees: TreeCounts;
  payoutsReleased: string;
  planterBudget: string;
  releasedBps: number | null;
  carbon: {
    campaignEstimate: { estimatedAmount: string } | null;
    reservation: { reservedAmount: string; allocatedAmount: string } | null;
    issuedHoldings: { issuedAmount: string };
  };
};

type CardsPage = { items: DonorCard[]; nextCursor: string | null; total: number };

export const useDonorDashboard = () => {
  const { ready, key } = useAccountKey();

  return useQuery({
    queryKey: ['donor', 'dashboard', ...key],
    queryFn: ({ signal }) => api<Dashboard>('/donor/dashboard', { signal }),
    enabled: ready,
  });
};

/** `GET /donor/campaigns`, no `limit` (the default 20 is the page); a tab change keeps the cards on screen while it loads. */
export const useDonorCampaigns = (status: string | undefined) => {
  const { ready, key } = useAccountKey();

  return useInfiniteQuery({
    queryKey: ['donor', 'campaigns', status, ...key],
    queryFn: ({ pageParam, signal }) =>
      api<CardsPage>('/donor/campaigns', { query: { status, cursor: pageParam }, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    enabled: ready,
  });
};
