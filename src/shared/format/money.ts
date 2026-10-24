// FR-210 / README §4: money arrives as a decimal string of USDC base units (6 decimals) and is never a JS number
// until it is drawn (REG-001): `1033200000` → "1,033.2", `1050000` → "1.05".
const DECIMALS = 6;
const TEN = 10;
const SCALE = BigInt(TEN) ** BigInt(DECIMALS);

/** "1,033.2": whole USDC en-US grouped, the fraction without trailing zeros. */
export const usdc = (units: string): string => {
  const value = BigInt(units);
  // '050000' → '05': the number drops the trailing zeros without a backtracking pattern
  const fraction = Number(`0.${(value % SCALE).toString().padStart(DECIMALS, '0')}`)
    .toString()
    .slice(2);
  const whole = (value / SCALE).toLocaleString('en-US');

  return fraction === '' ? whole : `${whole}.${fraction}`;
};

/** USDC as a plain number, for art and bar heights only (never for display text). */
export const usdcValue = (units: string): number => Number(units) / Number(SCALE);
