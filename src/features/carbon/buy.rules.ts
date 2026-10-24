import { INVALID_AMOUNT, OVER_INVENTORY } from './batch.copy';

// D08's rules (s08-batch.md §4, §5), pure: the typed tonnes as units of a thousandth, what the contract will charge for
// them, and where the typed amount is kept. bigint all the way; the API never sees the amount.
const AMOUNT_PATTERN = /^\d+(\.\d{1,3})?$/u;
const THOUSAND = 1000n;
const NONE = BigInt(0);
const FRACTION_DIGITS = 3;
const ROUNDING = 999n;

/** FR-210: the amount in carbon units (1000 = 1 tCO₂e), or `null` unless it is positive with at most 3 decimals. */
export const parseUnits = (text: string): bigint | null => {
  const trimmed = text.trim();

  if (!AMOUNT_PATTERN.test(trimmed)) {
    return null;
  }

  const [whole = '0', fraction = ''] = trimmed.split('.');
  const units = BigInt(whole) * THOUSAND + BigInt(fraction.padEnd(FRACTION_DIGITS, '0'));

  return units > NONE ? units : null;
};

/** FR-216: `ceil(units × price / 1000)`, the display and the approval; `null` while the amount or the price is missing. */
export const quoteOf = (units: bigint | null, price: bigint | null): bigint | null =>
  units === null || price === null || price === NONE ? null : (units * price + ROUNDING) / THOUSAND;

/** The typed amount's `sessionStorage` key: by account, wallet, chain and batch, so it never reaches another (NFR-051). */
export const draftKey = (
  profile: { id: string; walletAddress: string | null },
  chainId: number,
  batchId: string,
): string =>
  `treecord:draft:${profile.id}:${profile.walletAddress ?? 'no-wallet'}:${chainId}:carbon-buy:${batchId}`;

/** The first rule the typed amount breaks on submit (s08-batch.md §5), or `null`: positive, three decimals at most, within stock. */
export const amountProblem = (text: string, inventory: string): string | null => {
  const units = parseUnits(text);

  if (units === null) {
    return INVALID_AMOUNT;
  }

  return units > BigInt(inventory) ? OVER_INVENTORY : null;
};
