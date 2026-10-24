// S09's display rules (s09-certificate.md §4). No React here.
import type { Retirement } from './certificate.api';

const HEAD = 6;
const TAIL = 4;

/** "0x1a2b…9f0e": a holder address or a transaction hash, short (mockup `shortAddr`). */
export const shortHex = (hex: string): string => `${hex.slice(0, HEAD)}…${hex.slice(-TAIL)}`;

/** The retired share of the batch, 0 to 1; a batch that issued nothing has none. */
export const shareOf = ({ amount, batch }: Pick<Retirement, 'amount' | 'batch'>): number =>
  Number(batch.issuedAmount) === 0 ? 0 : Number(amount) / Number(batch.issuedAmount);

const NAME_MAX = 16;
const NAME_CUT = 15;

/** `RetireArt`'s "For {name}": over 16 characters, the first 15 and an ellipsis (decorative only). */
export const artName = (beneficiary: string): string =>
  beneficiary.length > NAME_MAX ? `${beneficiary.slice(0, NAME_CUT)}…` : beneficiary;
