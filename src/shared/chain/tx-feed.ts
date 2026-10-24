import { useSyncExternalStore } from 'react';

// Every transaction this tab sends, newest first, for the receipt cards (app/shell/TxReceipts). Privy's own dialog
// shows no hash, so `sendWrite` publishes one as soon as the wallet has signed and `settle` records how it ended.
export type TxEntry = {
  hash: string;
  /** The contract function, as the receipt names the action. */
  action: string;
  status: 'pending' | 'confirmed' | 'reverted';
  block: string | null;
};

const KEPT = 3;
let entries: readonly TxEntry[] = [];
const listeners = new Set<() => void>();

const emit = (next: readonly TxEntry[]): void => {
  entries = next;
  listeners.forEach((listener) => listener());
};

/** A transaction just signed and broadcast. */
export const publishTx = (hash: string, action: string): void =>
  emit(
    [
      { hash, action, status: 'pending' as const, block: null },
      ...entries.filter((entry) => entry.hash !== hash),
    ].slice(0, KEPT),
  );

/** How it ended; a hash this tab did not publish (a resumed flow) is added as it settles. */
export const settleTx = (hash: string, status: 'confirmed' | 'reverted', block: string): void => {
  const known = entries.some((entry) => entry.hash === hash);
  const settled = known
    ? entries.map((entry) => (entry.hash === hash ? { ...entry, status, block } : entry))
    : [{ hash, action: '', status, block }, ...entries].slice(0, KEPT);

  emit(settled);
};

export const dismissTx = (hash: string): void =>
  emit(entries.filter((entry) => entry.hash !== hash));

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => listeners.delete(listener);
};

export const useTxFeed = (): readonly TxEntry[] => useSyncExternalStore(subscribe, () => entries);
