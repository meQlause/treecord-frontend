// The session the shell, the guards and the screens read (shell.md §1): Privy says who is signed in, `GET /me` says
// what they may do. Nothing here is written to storage.

import { usePrivy } from '@privy-io/react-auth';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../shared/api/errors';
import type { Role } from '../route-handle';
import { useMe } from './use-me';

export type Profile = {
  id: string;
  role: Role;
  displayName: string | null;
  walletAddress: string | null;
  email: string | null;
  isBuyer: boolean;
  carbonRightsAgreementAccepted: boolean;
};

type Session =
  | { phase: 'resolving' }
  // `expired`: the token was refused (SH-15), not "never signed in"; S02 says so (ui-gaps pattern 12)
  | { phase: 'signed-out'; expired: boolean }
  | { phase: 'error' }
  | { phase: 'ready'; profile: Profile };

/** Typed form drafts live in `sessionStorage` under this prefix (shell.md §1) and go with the account. */
const DRAFT_PREFIX = 'treecord:draft:';

// A /me answer that leaves the person without a profile: 409 wallet_already_linked (SH-16) or a refused token
// (SH-15). The screens treat them as signed out; S02 explains.
const REFUSED_TOKEN = new Set(['missing_token', 'invalid_token']);

const NO_PROFILE = new Set(['wallet_already_linked', ...REFUSED_TOKEN]);

type MeState = Pick<ReturnType<typeof useMe>, 'status' | 'data' | 'error'>;

const resolve = (ready: boolean, authenticated: boolean, query: MeState): Session => {
  if (!ready) {
    return { phase: 'resolving' };
  }

  if (!authenticated || (query.error instanceof ApiError && NO_PROFILE.has(query.error.code))) {
    return {
      phase: 'signed-out',
      expired: query.error instanceof ApiError && REFUSED_TOKEN.has(query.error.code),
    };
  }

  if (query.data !== undefined) {
    return { phase: 'ready', profile: query.data };
  }

  return { phase: query.status === 'error' ? 'error' : 'resolving' };
};

/** Sign-out step 3 (shell.md §4): the query cache and the typed drafts of the account that is leaving. */
export const clearPrivateState = (queryClient: QueryClient): void => {
  queryClient.clear();

  try {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith(DRAFT_PREFIX))
      .forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // storage blocked: no draft was ever written
  }
};

export function useSession(): Session & { signOut: () => Promise<void> } {
  const { ready, authenticated, logout } = usePrivy();
  const queryClient = useQueryClient();
  const query = useMe();
  const signOut = async (): Promise<void> => {
    await logout();
    clearPrivateState(queryClient);
  };

  return { ...resolve(ready, authenticated, query), signOut };
}
