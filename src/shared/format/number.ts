const MAX_FRACTION_DIGITS = 6;
const GROUPED = new Intl.NumberFormat('en-US', { maximumFractionDigits: MAX_FRACTION_DIGITS });

/** "1,234.5" (en-US grouping, up to six decimals), as the mockup's `number`. */
export const number = (value: number): string => GROUPED.format(value);
