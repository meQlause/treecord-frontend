// The pure rules of S27–S29 (s27 §4, s28 §4, s29 §4): what each field accepts, USDC to base units with bigint only, and the
// shapes of the ids in the route.
const WALLET = /^0x[0-9a-fA-F]{40}$/u;
const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu;
const TREE_ID = /^[1-9]\d{0,18}$/u;
const TONNES = /^(0|[1-9]\d{0,17})(\.\d{1,3})?$/u;
const PRICE = /^\d+(\.\d{1,6})?$/u;
const MAX_SLOTS = 65_535;
const VINTAGE_MIN = 2000;
const VINTAGE_MAX = 2100;
const REGISTRY_MIN = 2;
const REGISTRY_MAX = 64;
const SERIAL_MAX = 200;
const NOTE_MAX = 2000;
const RESOLUTION_MIN = 3;
const MICRO = 6;
const UINT_BITS = 256;
const DECIMAL_BASE = 10;
const PERCENT = 100;

export const isUuid = (text: string): boolean => UUID.test(text);

export const isTreeId = (text: string): boolean => TREE_ID.test(text);

export const NOTE_LIMIT = NOTE_MAX;

/** `whole × 10⁶ + fraction padded to 6 digits`, as base units without leading zeros: `"18.5"` → `"18500000"`. */
export const toUsdcBaseUnits = (input: string): string => {
  const [whole = '0', fraction = ''] = input.split('.');

  return (
    BigInt(whole) * BigInt(DECIMAL_BASE) ** BigInt(MICRO) +
    BigInt(fraction.padEnd(MICRO, '0'))
  ).toString();
};

/** Up to 6 decimals and below 2²⁵⁶: zero is valid (it pauses sales). */
export const priceOk = (text: string): boolean =>
  PRICE.test(text) && BigInt(toUsdcBaseUnits(text)) < BigInt(2) ** BigInt(UINT_BITS);

const tonnesOk = (text: string): boolean => TONNES.test(text) && Number(text) > 0;

export const walletOk = (text: string): boolean => WALLET.test(text);

export const countOk = (text: string, available: number): boolean =>
  /^\d+$/u.test(text) && Number(text) >= 1 && Number(text) <= Math.min(MAX_SLOTS, available);

export const maxCount = (available: number): number => Math.min(MAX_SLOTS, available);

export type Issuance = {
  registry: string;
  vintage: string;
  serialStart: string;
  serialEnd: string;
  tonnes: string;
  key: string | null;
};

export const currentYear = (): string => String(new Date().getUTCFullYear());

export const issuanceOk = (issuance: Issuance): boolean => {
  const registry = issuance.registry.trim().length;
  const vintage = Number(issuance.vintage);

  return (
    registry >= REGISTRY_MIN &&
    registry <= REGISTRY_MAX &&
    Number.isInteger(vintage) &&
    vintage >= VINTAGE_MIN &&
    vintage <= VINTAGE_MAX &&
    [issuance.serialStart, issuance.serialEnd].every(
      (serial) => serial.trim().length >= 1 && serial.trim().length <= SERIAL_MAX,
    ) &&
    tonnesOk(issuance.tonnes)
  );
};

/** The body of `POST …/issuances`: strings trimmed, `vintage` an integer, `tonnes` the typed string. */
export const issuanceBody = (issuance: Issuance) => ({
  registry: issuance.registry.trim(),
  vintage: Number(issuance.vintage),
  serialStart: issuance.serialStart.trim(),
  serialEnd: issuance.serialEnd.trim(),
  tonnes: issuance.tonnes,
});

/** Trimmed code points, 3 to 2,000 (flags §3). */
export const resolutionOk = (note: string): boolean => [...note.trim()].length >= RESOLUTION_MIN;

export const noteOk = (note: string): boolean => note.trim().length >= 1;

/** `750` basis points of maturity as `7.5`. */
export const percentOfBps = (bps: number): string => String(bps / PERCENT);

/** `"30.00"` → `30`. */
export const plainNumber = (text: string): string => String(Number(text));
