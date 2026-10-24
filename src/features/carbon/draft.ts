// A typed-but-unsent value of a carbon form, kept in `sessionStorage` under the account, wallet, chain and target (NFR-051;
// the sign-out takes it away). Every storage access is guarded: a blocked store means a draft that lives as long as the page.
import { useState } from 'react';

const readStored = (key: string | null): string => {
  try {
    return key === null ? '' : (window.sessionStorage.getItem(key) ?? '');
  } catch {
    return '';
  }
};

const writeStored = (key: string | null, text: string | null): void => {
  try {
    if (key !== null && text === null) {
      window.sessionStorage.removeItem(key);
    } else if (key !== null) {
      window.sessionStorage.setItem(key, text ?? '');
    }
  } catch {
    // storage blocked: the amount lives as long as the page
  }
};

/**
 * The typed amount, kept in `sessionStorage` under the account, wallet, chain and batch. The key is known only once the
 * profile is, so what is stored is read for the key at hand each time, and only what was typed here overrides it.
 */
export function useDraftText(key: string | null) {
  const [typed, setTyped] = useState<Readonly<Record<string, string>>>({});
  const text = key === null ? '' : (typed[key] ?? readStored(key));

  return {
    text,
    set: (next: string): void => {
      setTyped((now) => (key === null ? now : { ...now, [key]: next }));
      writeStored(key, next);
    },
    clear: (): void => {
      setTyped((now) => (key === null ? now : { ...now, [key]: '' }));
      writeStored(key, null);
    },
  };
}
