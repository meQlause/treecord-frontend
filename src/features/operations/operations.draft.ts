// The typed-but-unsent values of S27–S29 in `sessionStorage` (user decision 23 Oct 2026): written on change, restored on mount,
// removed on sign-out with every `treecord:draft:` key. The key follows account, wallet, chain, screen and target.
import { config } from '../../app/session/config';
import { useSession } from '../../app/session/session';
import { useDraftText } from '../carbon/draft';

const parse = <T extends object>(text: string, initial: T): T => {
  try {
    return text === '' ? initial : { ...initial, ...(JSON.parse(text) as Partial<T>) };
  } catch {
    return initial;
  }
};

/** `[value, patch, clear]` of one draft; the key is unknown until the profile is, so nothing is stored before then. */
export function useJsonDraft<T extends object>(scope: string, target: string, initial: T) {
  const session = useSession();
  const profile = session.phase === 'ready' ? session.profile : null;
  const key =
    profile === null
      ? null
      : `treecord:draft:${profile.id}:${profile.walletAddress ?? 'no-wallet'}:${config().chainId}:${scope}:${target}`;
  const { text, set, clear } = useDraftText(key);
  const value = parse(text, initial);

  return {
    value,
    patch: (next: Partial<T>): void => set(JSON.stringify({ ...value, ...next })),
    clear,
  };
}
