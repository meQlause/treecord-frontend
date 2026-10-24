// The typed-but-unsaved form of S11 (s11-profile.md §1): kept in `sessionStorage` under the account, wallet and chain,
// so leaving the page and coming back finds it, and the sign-out takes it away (NFR-051). Only what was edited is kept,
// so an untouched form keeps following the profile. Every storage access is guarded: a blocked store means no draft.
import { useState } from 'react';
import type { Draft } from './profile.rules';

type Typed = Partial<Draft>;

const read = (key: string): Typed => {
  try {
    const stored = window.sessionStorage.getItem(key);

    return stored === null ? {} : (JSON.parse(stored) as Typed);
  } catch {
    return {};
  }
};

const write = (key: string, typed: Typed): void => {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(typed));
  } catch {
    // storage blocked: the draft lives only as long as the page
  }
};

const remove = (key: string): void => {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // nothing was written
  }
};

/** The edits typed so far (PF-7, PF-8): `edit` keeps one more field, `discard` forgets them all (PF-11). */
export function useDraft(key: string) {
  const [typed, setTyped] = useState<Typed>(() => read(key));

  const edit = (change: Typed): void => {
    const next = { ...typed, ...change };

    setTyped(next);
    write(key, next);
  };

  const discard = (): void => {
    setTyped({});
    remove(key);
  };

  return { typed, edit, discard };
}
