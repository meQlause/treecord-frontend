import { config } from '../../app/session/config';

// trees.md "Changes": the API sends hashes; the explorer link is built here from the chain id (Base Sepolia, 84532).
const EXPLORERS: Readonly<Record<number, string>> = { 84532: 'https://sepolia.basescan.org' };

const explorer = (path: string): string | null => {
  const root = EXPLORERS[config().chainId];

  return root === undefined ? null : `${root}/${path}`;
};

/** The transaction page, or `null` on a chain with no public explorer (the local one). */
export const txUrl = (hash: string): string | null => explorer(`tx/${hash}`);

export const blockUrl = (block: string): string | null => explorer(`block/${block}`);
