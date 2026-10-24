// POST /api/v1/profile (accounts.md §2) as S11 calls it. "Save profile" is optimistic (user decision, 23 Oct 2026,
// FR-018/FR-019): the `['me', …]` cache is patched at once and rolled back on any error. The role switch is not: the
// role shown stays the old one until the server says otherwise (PF-19).
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '../../app/session/api';
import { ME_KEY } from '../../app/session/use-me';
import type { Profile } from '../../app/session/session';
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

export function useSwitchRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Switch) => post(body),
    onSuccess: async (body) => {
      replace(queryClient, body);
      dropOldRolePrivateData(queryClient);
      await queryClient.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}
