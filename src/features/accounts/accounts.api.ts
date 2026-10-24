// The accounts API as S11 and S12 call it. POST /api/v1/profile (accounts.md §2): "Save profile" is optimistic (user decision, 23 Oct 2026,
// FR-018/FR-019): the `['me', …]` cache is patched at once and rolled back on any error. The role switch is not: the
// role shown stays the old one until the server says otherwise (PF-19).
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { api } from '../../app/session/api';
import { ApiError } from '../../shared/api/errors';
import { useAccountKey } from '../../app/session/use-account-key';
import { ME_KEY } from '../../app/session/use-me';
import type { Profile } from '../../app/session/session';
import { FIRST_POLL_MS, isSettled, pollDelay, type JobStatus } from './accounts.rules';
import type { Changes } from './profile.rules';

type MeBody = { profile: Omit<Profile, 'email'> };

type Snapshot = [readonly unknown[], MeBody | undefined][];

const post = (body: object) => api<MeBody>('/profile', { method: 'POST', body });

/** Every `me` answer the cache holds, so a rollback puts each one back. */
const snapshotOf = (queryClient: QueryClient): Snapshot =>
  queryClient.getQueriesData<MeBody>({ queryKey: ME_KEY });

const patch = (queryClient: QueryClient, changes: Changes): void => {
  queryClient.setQueriesData<MeBody>({ queryKey: ME_KEY }, (old) =>
    old === undefined ? old : { profile: { ...old.profile, ...changes } },
  );
};

const replace = (queryClient: QueryClient, body: MeBody): void => {
  queryClient.setQueriesData<MeBody>({ queryKey: ME_KEY }, body);
};

export function useSaveProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (changes: Changes) => post(changes),
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: ME_KEY });
      const snapshot = snapshotOf(queryClient);

      patch(queryClient, changes);

      return { snapshot };
    },
    onError: (_error, _changes, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSuccess: (body) => replace(queryClient, body),
  });
}

type Switch = { role: string; carbonRightsAgreementAccepted?: true };

/** Everything keyed on the old role's account goes, except `me` itself and the public reads (PF-20). */
const dropOldRolePrivateData = (queryClient: QueryClient): void => {
  queryClient.removeQueries({
    predicate: ({ queryKey }) => queryKey[0] !== ME_KEY[0] && queryKey[0] !== 'public',
  });
};

// the refusals that mean the profile is not what the page thought (conflict, ui-gaps pattern 5): read it again
const PROFILE_CHANGED = new Set(['agreement_required', 'role_locked']);

export function useSwitchRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Switch) => post(body),
    onError: (error) => {
      if (error instanceof ApiError && PROFILE_CHANGED.has(error.code)) {
        void queryClient.invalidateQueries({ queryKey: ME_KEY });
      }
    },
    onSuccess: async (body) => {
      replace(queryClient, body);
      dropOldRolePrivateData(queryClient);
      await queryClient.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}

// ---- GET /api/v1/jobs/:id (jobs.md §2) ----
export type Job = {
  id: string;
  kind: string;
  status: JobStatus;
  attempts: number;
  txHash: string | null;
  createdAt: string;
  updatedAt: string;
  context: { campaign: string | null; treeId: string | null };
  /** Operators only: the key is absent for everyone else (NFR-055). */
  lastError?: string | null;
};

type Pace = { stamp: number; seen: string; delay: number };

/**
 * One job, followed until it is `confirmed` or `failed` (FR-027, NFR-063): a poll after 2 s, then each poll that finds the
 * same job waits 1.5 times longer, up to 5 s. Nothing runs while the tab is hidden or the browser offline.
 */
export function useJob(id: string, enabled: boolean) {
  const { ready, key } = useAccountKey();
  const pace = useRef<Pace>({ stamp: 0, seen: '', delay: FIRST_POLL_MS });

  return useQuery({
    queryKey: [...key, 'job', id],
    queryFn: ({ signal }) => api<{ job: Job }>(`/jobs/${id}`, { signal }),
    enabled: enabled && ready,
    select: ({ job }) => job,
    refetchIntervalInBackground: false,
    refetchInterval: ({ state }) => {
      const job = state.data?.job;

      if (job === undefined || isSettled(job.status)) {
        return false;
      }

      // a failed poll counts as "found the same job": the page keeps what it read and waits longer
      const stamp = Math.max(state.dataUpdatedAt, state.errorUpdatedAt);

      if (stamp !== pace.current.stamp) {
        const seen = `${job.status}|${job.updatedAt}`;

        pace.current = {
          stamp,
          seen,
          delay: pollDelay(pace.current.delay, seen !== pace.current.seen),
        };
      }

      return pace.current.delay;
    },
  });
}
