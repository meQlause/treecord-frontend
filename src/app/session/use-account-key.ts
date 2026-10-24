// The key part every private query shares: who is signed in, with which wallet, on which chain (NFR-051). `ready` is false
// until the profile is known; a query waits for it, so one account's data never lands under another's key.
import { config } from './config';
import { useSession } from './session';

export function useAccountKey(): { ready: boolean; key: (string | number | undefined)[] } {
  const session = useSession();
  const profile = session.phase === 'ready' ? session.profile : undefined;

  return {
    ready: profile !== undefined,
    key: [profile?.id, profile?.walletAddress ?? 'no-wallet', config().chainId],
  };
}
