// docs/BE/features/campaigns.md §1-§3 as the screens read them. Public reads: S03's catalog and species list, S04's
// campaign (the bearer token, when the person is signed in, adds `viewer`).
import { usePrivy } from '@privy-io/react-auth';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../../app/session/api';
import { config } from '../../app/session/config';

type CampaignStatus = 'funding' | 'active' | 'refunding' | 'completed';

export type Species = { code: string; name: string };

export type CampaignItem = {
  address: string;
  status: CampaignStatus;
  title: string | null;
  species: Species | null;
  region: { name: string } | null;
  treeTarget: number;
  commitmentUnits: number;
  fundingTarget: string;
  fundedAmount: string;
  progressBps: number;
  daysLeft: number | null;
  fundingDeadlinePassed: boolean;
};

type Page<T> = { items: T[]; nextCursor: string | null; total: number };

export type CatalogFilters = {
  status: string | undefined;
  species: string | undefined;
  region: string | undefined;
};

/** `GET /species`, once per session (seed data, campaigns.md §3). */
export const useSpecies = () =>
  useQuery({
    queryKey: ['public', 'species'],
    queryFn: ({ signal }) => api<Page<Species>>('/species', { signal }),
    staleTime: Infinity,
    select: ({ items }) => items,
  });

/** `GET /campaigns`, newest first, one page per `nextCursor`; no `limit` is sent (the default 20 is the page size). */
export const useCampaignCatalog = (filters: CatalogFilters, enabled: boolean) =>
  useInfiniteQuery({
    queryKey: ['public', 'campaigns', filters],
    queryFn: ({ pageParam, signal }) =>
      api<Page<CampaignItem>>('/campaigns', { query: { ...filters, cursor: pageParam }, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });

export type BudgetRow = { bucket: string; bps: number; amount: string };

export type ScheduleStop = { milestone: number; month: number; bps: number };

export type CampaignDetail = Omit<CampaignItem, 'region'> & {
  chainId: number;
  region: { name: string | null; radiusM: number } | null;
  fundingDeadline: string;
  claimDeadline: string;
  claimDeadlinePassed: boolean;
  split: { incentivesBps: number };
  budget: BudgetRow[];
  incentiveSchedule: ScheduleStop[];
  slots: { anchor: number; open: number; planted: number; openAvailable: number };
};

export type Viewer = {
  role: 'donor' | 'planter' | 'operator' | 'auditor';
  walletAddress: string | null;
  contributedAmount: string;
  refundedAmount: string;
};

type CampaignBody = { campaign: CampaignDetail; viewer: Viewer | null };

/** `GET /campaigns/:address`. Keyed by account when signed in, so one account's `viewer` never reaches another. */
export const useCampaign = (address: string) => {
  const accountId = usePrivy().user?.id;

  return useQuery({
    queryKey:
      accountId === undefined
        ? ['public', 'campaign', address]
        : ['campaign', address, accountId, config().chainId],
    queryFn: ({ signal }) => api<CampaignBody>(`/campaigns/${address}`, { signal }),
  });
};
