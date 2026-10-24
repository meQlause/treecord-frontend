// docs/BE/features/audit.md §1-§9 as S23-S26 and S10 read them. Private reads are keyed by account, wallet and chain
// (NFR-051); the public reproduction is not. Every mutation writes what the server answered, never a guess (no optimistic UI).
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { api, publicApi } from '../../app/session/api';
import { useAccountKey } from '../../app/session/use-account-key';
import { isUuid, isTreeNumber } from './audit.rules';

export type Finding = 'ok' | 'issue' | 'needs_followup';

type Page<T> = { items: T[]; nextCursor: string | null; total: number };

export type Challenge = {
  id: string;
  code: string;
  issuedAt: string;
  expiresAt: string;
  fulfilledSubmissionId: string | null;
  status: 'open' | 'answered' | 'expired';
};

export type SessionItem = {
  id: string;
  status: 'open' | 'closed';
  campaign: { address: string; title: string };
  seedBlockNumber: string;
  populationSize: number;
  sampleSize: number;
  populationPreview: string[];
  sample: string[];
  findingsRecorded: number;
  challengesIssued: number;
  reportHash: string | null;
  createdAt: string;
};

export type Sample = {
  position: number;
  treeId: string;
  treeStatus: string;
  finding: Finding | null;
  notes: string | null;
  challenge: Challenge | null;
};

export type AuditSession = {
  id: string;
  status: 'open' | 'closed';
  campaign: { address: string; title: string; regionName: string };
  seed: { blockNumber: string; blockHash: string };
  population: string[];
  sampleSize: number;
  samples: Sample[];
  findingsRecorded: number;
  challengesIssued: number;
  reportHash: string | null;
  createdAt: string;
  closedAt: string | null;
};

export type Submission = {
  id: string;
  kind: string;
  milestone: number | null;
  status: string;
  device: { revokedAt: string | null } | null;
  precheckResults: {
    check: string;
    ok: boolean | null;
    value: string | null;
    reason: string | null;
  }[];
  verification: {
    signatureValid: boolean | null;
    canonicalMatchesPayload: boolean | null;
    evidenceHashMatches: boolean | null;
    videoHashMatches: boolean | null;
    recomputedSha256: string | null;
  } | null;
  policy: { decision: string; score: number; reasons: string[] } | null;
};

export type TreeBundle = {
  sessionId: string;
  sessionStatus: 'open' | 'closed';
  sample: { position: number; sampleSize: number; finding: Finding | null; notes: string | null };
  tree: { treeId: string; status: string };
  progress: { milestonesPaid: number; month: number };
  submissions: Submission[];
  challenge: Challenge | null;
  openChallenge: { code: string; issuedAt: string; expiresAt: string } | null;
};

export type Report = {
  sessionId: string;
  status: 'open' | 'closed';
  campaign: { title: string };
  reportHash: string | null;
  report: {
    sessionId: string;
    seed: { blockNumber: string; blockHash: string };
    population: string[];
    sampleSize: number;
    findings: { position: number; treeId: string; finding: Finding }[];
    totals: { ok: number; issue: number; needsFollowup: number };
    challenges: {
      treeId: string;
      code: string;
      expiresAt: string;
      fulfilledSubmissionId: string | null;
    }[];
    closedAt: string;
  } | null;
  notes: { findings: { position: number; notes: string | null }[]; summary: string } | null;
};

/** A JSON value as the report is hashed: strings, numbers, nulls, arrays and objects. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type Reproduction = {
  sessionId: string;
  status: 'open' | 'closed';
  campaign: { title: string };
  blockNumber: string;
  blockHash: string;
  algorithm: string;
  population: string[];
  sampleSize: number;
  sample: string[];
  reportHash: string | null;
  report: ({ notesHash: string } & { [key: string]: Json }) | null;
};

export type SessionStatus = 'open' | 'closed' | undefined;

const sessionKey = (key: unknown[], id: string): unknown[] => ['audit', ...key, 'session', id];

const sessionsKey = (key: unknown[]): unknown[] => ['audit', ...key, 'sessions'];

const bundleKey = (key: unknown[], id: string, treeId: string): unknown[] => [
  'audit',
  ...key,
  'tree',
  id,
  treeId,
];

const reportKey = (key: unknown[], id: string): unknown[] => ['audit', ...key, 'report', id];

/** `GET /audit/sessions`, newest first, one page per cursor (S23). */
export const useSessions = (status: SessionStatus) => {
  const { ready, key } = useAccountKey();

  return useInfiniteQuery({
    queryKey: [...sessionsKey(key), status],
    queryFn: ({ pageParam, signal }) =>
      api<Page<SessionItem>>('/audit/sessions', {
        query: { status, limit: 20, cursor: pageParam },
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    enabled: ready,
  });
};

export type CampaignOption = { address: string; title: string | null };

/**
 * Every campaign for the select: pages of 100 until `nextCursor` is null.
 * shortcut: loads every campaign into one select, a few hundred at most; a searchable combobox over the cursor after that.
 */
export const useCampaignOptions = () =>
  useQuery({
    queryKey: ['campaigns', 'all-for-audit'],
    queryFn: async ({ signal }) => {
      const options: CampaignOption[] = [];
      let cursor: string | undefined;

      do {
        const page = await publicApi<Page<CampaignOption>>('/campaigns', {
          query: { limit: 100, cursor },
          signal,
        });

        options.push(...page.items.map(({ address, title }) => ({ address, title })));
        cursor = page.nextCursor ?? undefined;
      } while (cursor !== undefined);

      return options;
    },
  });

/** `GET /audit/sessions/:id`; a malformed id is not found at once, without a request. */
export const useAuditSession = (id: string) => {
  const { ready, key } = useAccountKey();

  return useQuery({
    queryKey: sessionKey(key, id),
    queryFn: ({ signal }) => api<AuditSession>(`/audit/sessions/${id}`, { signal }),
    enabled: ready && isUuid(id),
  });
};

/**
 * `GET .../trees/:treeId`, once per visit: every load is logged by the server (FR-193), so it never refetches by itself.
 * `enabled` only while the tree is in the sample.
 */
export const useTreeBundle = (id: string, treeId: string, enabled: boolean) => {
  const { ready, key } = useAccountKey();

  return useQuery({
    queryKey: bundleKey(key, id, treeId),
    queryFn: ({ signal }) => api<TreeBundle>(`/audit/sessions/${id}/trees/${treeId}`, { signal }),
    enabled: ready && enabled && isUuid(id) && isTreeNumber(treeId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

/** `GET .../report`; a closed report never changes (FR-192), so it is kept for good. */
export const useReport = (id: string) => {
  const { ready, key } = useAccountKey();

  return useQuery({
    queryKey: reportKey(key, id),
    queryFn: ({ signal }) => api<Report>(`/audit/sessions/${id}/report`, { signal }),
    enabled: ready && isUuid(id),
    staleTime: Infinity,
  });
};

/** `GET .../reproduce`: public data, no account in the key and no token on the request. */
export const useReproduction = (id: string) =>
  useQuery({
    queryKey: ['reproduce', id],
    queryFn: ({ signal }) => publicApi<Reproduction>(`/audit/sessions/${id}/reproduce`, { signal }),
    enabled: isUuid(id),
    staleTime: Infinity,
  });

export const refreshSession = (client: QueryClient, key: unknown[], id: string): void => {
  void client.invalidateQueries({ queryKey: sessionKey(key, id) });
  void client.invalidateQueries({ queryKey: sessionsKey(key) });
};

/** "Open session" (S23): the 201 body seeds S24's cache, so S24 renders without a second GET. */
export const useOpenSession = () => {
  const client = useQueryClient();
  const { key } = useAccountKey();

  return useMutation({
    mutationFn: (body: { campaign: string; sampleSize: number }) =>
      api<AuditSession>('/audit/sessions', { method: 'POST', body }),
    onSuccess: (session) => {
      client.setQueryData(sessionKey(key, session.id), session);
      void client.invalidateQueries({ queryKey: sessionsKey(key) });
    },
  });
};

export type CloseBody = Report & { idempotent?: boolean };

/** D13 "Confirm": the 200 body is exactly S26's report, so S26 renders without a fetch. */
export const useCloseSession = (id: string) => {
  const client = useQueryClient();
  const { key } = useAccountKey();

  return useMutation({
    mutationFn: (summary: string) =>
      api<CloseBody>(`/audit/sessions/${id}/close`, { method: 'POST', body: { summary } }),
    onSuccess: (body) => {
      client.setQueryData(reportKey(key, id), body);
      refreshSession(client, key, id);
    },
  });
};

type FindingAnswer = { finding: Finding; notes: string | null };

/** D11 "Save finding": the server's own values go into the bundle cache; the session refetches. */
export const useSaveFinding = (id: string, treeId: string) => {
  const client = useQueryClient();
  const { key } = useAccountKey();

  return useMutation({
    mutationFn: (body: { treeId: string; finding: Finding; notes: string | null }) =>
      api<FindingAnswer>(`/audit/sessions/${id}/findings`, { method: 'POST', body }),
    onSuccess: ({ finding, notes }) => {
      client.setQueryData<TreeBundle>(bundleKey(key, id, treeId), (bundle) =>
        bundle === undefined ? bundle : { ...bundle, sample: { ...bundle.sample, finding, notes } },
      );
      refreshSession(client, key, id);
    },
  });
};

/** D12 "Issue challenge": the new code is written into the bundle cache; no refetch (it would log a second access). */
export const useIssueChallenge = (id: string, treeId: string) => {
  const client = useQueryClient();
  const { key } = useAccountKey();

  return useMutation({
    mutationFn: () =>
      api<Challenge>(`/audit/sessions/${id}/challenges`, { method: 'POST', body: { treeId } }),
    onSuccess: (challenge) => {
      client.setQueryData<TreeBundle>(bundleKey(key, id, treeId), (bundle) =>
        bundle === undefined
          ? bundle
          : {
              ...bundle,
              challenge,
              openChallenge: {
                code: challenge.code,
                issuedAt: challenge.issuedAt,
                expiresAt: challenge.expiresAt,
              },
            },
      );
      refreshSession(client, key, id);
    },
  });
};

/** After a refused challenge or finding the page re-reads the real state: the one allowed bundle refetch. */
export const refetchBundle = (
  client: QueryClient,
  key: unknown[],
  id: string,
  treeId: string,
): void => {
  void client.refetchQueries({ queryKey: bundleKey(key, id, treeId) });
};
