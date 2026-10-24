// S14's draft (s14-create-campaign.md §1 "Draft"): every input, the step and the saved metadata, in `sessionStorage` under the
// account, wallet and chain (user decision 23 Oct 2026). It is written on every change, read back on mount, and goes away on
// complete and on sign-out. `inputKey` is the metadata body itself, so a changed step-1 input is saved again (FR-079).
import type { Profile } from '../../app/session/session';
import { useDraftText } from '../carbon/draft';
import type { Saved } from './create.api';
import { INITIAL, type Draft, type Step } from './create.rules';

export type Metadata = Saved & { inputKey: string };

export type Stored = { draft: Draft; step: Step; metadata: Metadata | null };

const EMPTY: Stored = { draft: INITIAL, step: 0, metadata: null };

export const draftKey = (profile: Profile, chainId: number): string =>
  `treecord:draft:${profile.id}:${profile.walletAddress ?? 'no-wallet'}:${chainId}:create-campaign`;

/** The stored text as a draft: anything unreadable is a fresh form, and a field missing from an old draft takes its default. */
const parse = (text: string): Stored => {
  try {
    const stored = JSON.parse(text) as Partial<Stored>;

    return {
      draft: { ...INITIAL, ...stored.draft },
      step: stored.step ?? 0,
      metadata: stored.metadata ?? null,
    };
  } catch {
    return EMPTY;
  }
};

export function useStoredDraft(key: string) {
  const { text, set, clear } = useDraftText(key);
  const stored = text === '' ? EMPTY : parse(text);

  return {
    stored,
    /** Merges into what is stored; the fields are locked while a submit runs, so a step finishing late undoes nothing. */
    save: (patch: Partial<Stored>): void => set(JSON.stringify({ ...stored, ...patch })),
    clear,
  };
}
