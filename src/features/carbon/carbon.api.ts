// docs/BE/features/carbon.md §1 as S07 reads it: every mirrored batch, newest issuance first. Public: the endpoint
// ignores a token and none is sent, so the key holds no account, wallet or chain (s07-carbon.md §1).
import { useQuery } from '@tanstack/react-query';
import { api } from '../../app/session/api';

export type Availability = 'available' | 'sold_out' | 'sales_paused' | 'price_not_set';

export type CarbonBatch = {
  batchId: string;
  label: string;
  campaign: {
    title: string;
    region: string;
    species: { name: string };
  };
  registry: string;
  vintage: number;
  issuedAmount: string;
  inventoryAmount: string;
  usdcPerTonne: string | null;
  availability: Availability;
};

/** S07 asks for the largest page and filters in the browser (FR-219); past 100 batches the oldest are not listed. */
const PAGE_SIZE = 100;

export const useBatches = () =>
  useQuery({
    queryKey: ['carbon', 'batches'],
    queryFn: ({ signal }) =>
      api<{ items: CarbonBatch[] }>('/carbon/batches', { query: { limit: PAGE_SIZE }, signal }),
    select: ({ items }) => items,
  });
