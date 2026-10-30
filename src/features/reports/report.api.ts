// reports.md §1–§2: the public report and the later pages of its evidence record. Neither endpoint reads a token, so
// none is sent (s06 header): this client has no token source, unlike `app/session/api`.
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { config } from '../../app/session/config';
import { createClient } from '../../shared/api/client';
import { isAddress } from './report.rules';

export type EvidenceItem = {
  treeId: string;
  kind: string;
  month: number | null;
  at: string;
  evidenceHash: string;
  blockNumber: string;
  txHash: string;
};

type EvidencePage = { items: EvidenceItem[]; nextCursor: string | null; total: number };

export type Batch = {
  batchId: string;
  registry: string;
  vintage: number;
  serialStart: string;
  serialEnd: string;
  issuedAmount: string;
  issuedTxHash: string | null;
};

export type Report = {
  generatedAt: string;
  campaign: {
    address: string;
    status: string;
    title: string | null;
    species: { name: string };
    region: { name: string; radiusM: number };
    treeTarget: number;
    commitmentUnits: number;
  };
  trees: {
    planted: number;
    alive: number;
    flagged: number;
    dead: number;
    removed: number;
    completed: number;
    survivalRateBps: number | null;
    averageAgeDays: number | null;
  };
  funding: {
    fundingTarget: string;
    fundedAmount: string;
    progressBps: number;
    contributors: number;
    refundedAmount: string;
  };
  incentives: {
    paidAmount: string;
    paidBps: number | null;
    forfeitedAmount: string;
    /** FR-244: how many forfeits the Chainlink keeper sent. */
    chainlinkEnforced: number;
    byMilestone: { month: number; payouts: number; amount: string }[];
  };
  carbon: {
    estimate: { estimatedAmount: string | null; method: { model: string } | null };
    issued: { issuedAmount: string; retiredAmount: string; batches: Batch[] };
  };
  evidence: EvidencePage;
};

const publicApi = (path: string, query?: { cursor: string }, signal?: AbortSignal) =>
  createClient({ baseUrl: config().apiUrl, getToken: () => Promise.resolve(null) })<unknown>(path, {
    ...(query === undefined ? {} : { query }),
    ...(signal === undefined ? {} : { signal }),
  });

/** R-1…R-4. A malformed address is R-3 without a request (s06 §4). */
export function useReport(address: string) {
  return useQuery({
    queryKey: ['public', 'report', address],
    enabled: isAddress(address),
    queryFn: async ({ signal }) =>
      ((await publicApi(`/reports/campaign/${address}`, undefined, signal)) as { report: Report })
        .report,
  });
}

/**
 * Pages 2…n (E-4…E-6). Page 1 is the report's own `evidence`, so the query is manual: its first page is fetched with
 * the report's `nextCursor`, which the button hands in as the initial page param.
 */
export function useEvidencePages(address: string, firstCursor: string | null) {
  return useInfiniteQuery({
    queryKey: ['public', 'report-evidence', address],
    enabled: false,
    initialPageParam: firstCursor,
    queryFn: async ({ pageParam, signal }) =>
      (await publicApi(
        `/reports/campaign/${address}/evidence`,
        { cursor: pageParam ?? '' },
        signal,
      )) as EvidencePage,
    getNextPageParam: (last) => last.nextCursor,
  });
}
