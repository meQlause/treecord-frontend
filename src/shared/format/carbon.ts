import { number } from './number';

// README §4 / FR-068: carbon arrives as a decimal string of units, 1,000 units = 1 tCO₂e.
const DECIMALS = 3;
const TEN = 10;
const PER_TONNE = BigInt(TEN) ** BigInt(DECIMALS);

/** "8.005": tonnes with three decimals, kept exact. */
export const tonnes = (units: string): string => {
  const value = BigInt(units);

  return `${value / PER_TONNE}.${(value % PER_TONNE).toString().padStart(DECIMALS, '0')}`;
};

/** "8,005": a unit count, en-US grouped. */
export const unitCount = (units: string): string => number(Number(units));
