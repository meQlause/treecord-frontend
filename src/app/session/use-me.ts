// GET /api/v1/me (accounts.md §1; shell.md §2, §1 state table): the caller's profile, keyed so one account's data is
// never shown to another (NFR-051). `staleTime: 0` because the response is `no-store`.

import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { config } from './config';
import type { Profile } from './session';

/** Prefix of every `me` query: `invalidateQueries({ queryKey: ME_KEY })` after a profile change. */
export const ME_KEY = ['me'] as const;

// the body of GET /me; the fields S11 alone reads (`carbonRightsAcceptedAt`, `createdAt`) arrive and are ignored here
type MeBody = { profile: Omit<Profile, 'email'> };

export function useMe() {
  const { ready, authenticated, user } = usePrivy();
  // the email is the Privy session's; the API never sees it (accounts.md header)
  const email = user?.email?.address ?? null;

  return useQuery({
    queryKey: [...ME_KEY, user?.id, config().chainId],
    queryFn: ({ signal }) => api<MeBody>('/me', { signal }),
    enabled: ready && authenticated,
    staleTime: 0,
    // refetched on window focus and after a profile change (shell.md §2), not by every component that mounts and asks
    refetchOnMount: false,
    select: ({ profile }): Profile => ({ ...profile, email }),
  });
}
