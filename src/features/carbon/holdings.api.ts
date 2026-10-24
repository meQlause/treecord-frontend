// docs/BE/features/carbon.md §3-§4 as S15 reads them: the signed-in wallet's carbon, and more of its retirements. Private:
// keyed by account, wallet and chain, so one account's holdings never reach another (NFR-051, s15-my-carbon.md §1).
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../../app/session/api';
import { useAccountKey } from '../../app/session/use-account-key';

type Species = { code: string; name: string };

export type Balance = {
  batchId: string;
  label: string;
  campaign: { address: string; title: string; region: string };
  registry: string;
  vintage: number;
  serialStart: string;
  serialEnd: string;
  amount: string;
  retiredAmount: string;
};

export type Reservation = {
  campaign: { address: string; title: string; region: string; species: Species };
  label: string;
  reservedAmount: string;
  allocatedAmount: string;
  unfilledAmount: string;
  declined: boolean;
  updatedAt: string;
};

export type Retirement = {
  retirementId: string;
  batchId: string;
  registry: string;
  amount: string;
  beneficiary: string;
  purpose: string | null;
  retiredAt: string;
  txHash: string;
  registryRetirement: { status: 'pending' | 'done'; reference: string | null };
};

type RetirementPage = { items: Retirement[]; nextCursor: string | null; total: number };

export type Holdings = {
  summary: { issuedAmount: string; unfilledAmount: string; retiredAmount: string };
  reservations: Reservation[];
  balances: Balance[];
  retirements: RetirementPage;
};

/** `GET /carbon/holdings`; `poll` asks again every `pollMs` (D09 and D10 are being indexed). */
export const useHoldings = (poll: number | false = false) => {
  const { ready, key } = useAccountKey();

  return useQuery({
    queryKey: ['carbon', 'holdings', ...key],
    queryFn: ({ signal }) => api<Holdings>('/carbon/holdings', { signal }),
    enabled: ready,
    refetchInterval: poll,
  });
};

const PAGE = 20;

/** The retirements past the first page, fetched on "load more" from the holdings' own cursor (carbon.md §4). */
export const useMoreRetirements = (cursor: string | null) => {
  const { key } = useAccountKey();

  return useInfiniteQuery({
    queryKey: ['carbon', 'retirements', ...key, cursor],
    queryFn: ({ pageParam, signal }) =>
      api<RetirementPage>('/carbon/holdings/retirements', {
        query: { cursor: pageParam, limit: PAGE },
        signal,
      }),
    initialPageParam: cursor ?? undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: false,
  });
};
