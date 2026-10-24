// S14's rules (s14-create-campaign.md §2, §4), pure: what each step accepts, the bigint math of the budget, the metadata body
// the API saves, and the config the factory takes. Percentages are basis points, USDC is base units; nothing is a float.
import { stringToHex, type Address } from 'viem';
import * as copy from './create.copy';

const BPS = 10_000n;
const NONE = BigInt(0);
const DECIMAL_BASE = 10;
const TEN = BigInt(DECIMAL_BASE);
const RESERVE_SLOT = 3;
const MICRO_DIGITS = 6;
const PERCENT_DIGITS = 2;
const PERCENT_SCALE = 100;
const SECOND_MS = 1000;
const MAX_URLS = 10;
const MAX_URL_LENGTH = 2048;
const DESCRIPTION_MAX = 5000;
const LAT_MAX = 90;
const LON_MAX = 180;
const SPECIES_BYTES = 32;
const GEOHASH_BYTES = 8;
const GEOHASH_CHARS = 7;
const BITS_PER_CHAR = 5;
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

type Range = { min: number; max: number };

const TITLE: Range = { min: 3, max: 120 };
const REGION: Range = { min: 2, max: 120 };
const RADIUS: Range = { min: 100, max: 100_000 };
const TREES: Range = { min: 1, max: 4_294_967_295 };
const MONTHS: Range = { min: 36, max: 65_535 };
const CAP: Range = { min: 1, max: 65_535 };

export type Draft = {
  title: string;
  description: string;
  /** The species `code` from `GET /species`; empty until one is picked (the first is then used). */
  species: string;
  region: string;
  lat: string;
  lon: string;
  radius: string;
  urls: string;
  trees: string;
  target: string;
  anchor: string;
  cap: string;
  months: string;
  funding: string;
  claim: string;
  splits: string[];
  creator: string;
};

export const INITIAL: Draft = {
  title: '',
  description: '',
  species: '',
  region: '',
  lat: '',
  lon: '',
  radius: '2500',
  urls: '',
  trees: '1000',
  target: '10000',
  anchor: '25',
  cap: '50',
  months: '36',
  funding: '',
  claim: '',
  splits: ['70', '10', '5', '10', '5'],
  creator: '',
};

export type Step = 0 | 1 | 2;

export type Errors = Partial<Record<keyof Draft | 'box', string>>;

/** `^\d+(\.\d{1,decimals})?$` as an integer of 10^-decimals, or `null`. */
export const units = (value: string, decimals = MICRO_DIGITS): bigint | null => {
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`, 'u').test(value)) {
    return null;
  }

  const [whole = '0', fraction = ''] = value.split('.');

  return BigInt(whole) * TEN ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0'));
};

const bps = (value: string): bigint | null => units(value, PERCENT_DIGITS);

const wholeBetween = (value: string, { min, max }: Range): boolean =>
  /^\d+$/u.test(value) && Number(value) >= min && Number(value) <= max;

const lengthBetween = (value: string, { min, max }: Range): boolean =>
  value.trim().length >= min && value.trim().length <= max;

const coordinate = (value: string, max: number): boolean =>
  value.trim() !== '' && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= max;

const lines = (urls: string): string[] =>
  urls
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

const isHttp = (text: string): boolean => {
  try {
    return ['http:', 'https:'].includes(new URL(text).protocol) && text.length <= MAX_URL_LENGTH;
  } catch {
    return false;
  }
};

const urlProblem = (urls: string): string | undefined => {
  const list = lines(urls);

  if (list.length > MAX_URLS) {
    return copy.TOO_MANY_URLS;
  }

  return list.every(isHttp) ? undefined : copy.BAD_URL;
};

/** The text fields of step 1: title, region, description, species. */
const textErrors = (draft: Draft, species: readonly string[]): Errors => ({
  ...(lengthBetween(draft.title, TITLE) ? {} : { title: copy.lengthRule(TITLE) }),
  ...(lengthBetween(draft.region, REGION) ? {} : { region: copy.lengthRule(REGION) }),
  ...(draft.description.length > DESCRIPTION_MAX ? { description: copy.DESCRIPTION_RULE } : {}),
  ...(species.includes(draft.species) ? {} : { species: copy.SPECIES_RULE }),
});

/** The planting area of step 1: the centre, the radius, the image URLs. */
const areaErrors = (draft: Draft): Errors => {
  const urls = urlProblem(draft.urls);

  return {
    ...(coordinate(draft.lat, LAT_MAX) ? {} : { lat: copy.coordinateRule(LAT_MAX) }),
    ...(coordinate(draft.lon, LON_MAX) ? {} : { lon: copy.coordinateRule(LON_MAX) }),
    ...(wholeBetween(draft.radius, RADIUS) ? {} : { radius: copy.wholeNumber(RADIUS) }),
    ...(urls === undefined ? {} : { urls }),
  };
};

const sumOf = (shares: (bigint | null)[]): bigint =>
  shares.reduce<bigint>((sum, share) => sum + (share ?? NONE), NONE);

/** What the contract will take for each bucket of the budget; the reserve takes the rounding remainder. */
export const amountsOf = (target: bigint | null, shares: string[]): bigint[] => {
  const parts = shares.map(bps);
  const amounts = parts.map((part) =>
    target === null || part === null ? NONE : (target * part) / BPS,
  );
  const valid = target !== null && parts.every((part) => part !== null) && sumOf(parts) === BPS;

  if (valid) {
    amounts[RESERVE_SLOT] =
      target -
      amounts.reduce((sum, amount, index) => (index === RESERVE_SLOT ? sum : sum + amount), NONE);
  }

  return amounts;
};

/** The counts of step 2: trees, per-planter cap, commitment. */
const limitErrors = (draft: Draft): Errors => ({
  ...(wholeBetween(draft.trees, TREES) ? {} : { trees: copy.wholeNumber(TREES) }),
  ...(wholeBetween(draft.cap, CAP) ? {} : { cap: copy.wholeNumber(CAP) }),
  ...(wholeBetween(draft.months, MONTHS) ? {} : { months: copy.wholeNumber(MONTHS) }),
});

const splitsValid = (splits: string[]): boolean => {
  const shares = splits.map(bps);

  return !shares.some((share) => share === null || share > BPS) && sumOf(shares) === BPS;
};

/** What each tree is paid, in base units, or `null` while the target, shares or tree count are not numbers (FR-078). */
const perTreeOf = (draft: Draft): bigint | null => {
  const target = units(draft.target);
  const [incentives] = draft.splits.map(bps);

  return target !== null && wholeBetween(draft.trees, TREES)
    ? (target * (incentives ?? NONE)) / BPS / BigInt(draft.trees)
    : null;
};

const shareErrors = (draft: Draft): Errors => {
  const anchor = bps(draft.anchor);
  const target = units(draft.target);

  return {
    ...(anchor === null || anchor > BPS ? { anchor: copy.ANCHOR_RULE } : {}),
    ...(target === null || target <= NONE ? { target: copy.TARGET_RULE } : {}),
    ...(splitsValid(draft.splits) ? {} : { splits: copy.SPLITS_RULE }),
  };
};

/** The money of step 2: the anchor share, the target, the five shares, and the per-tree incentive (FR-078). */
const moneyErrors = (draft: Draft): Errors => {
  const found = shareErrors(draft);

  return found.target === undefined && found.splits === undefined && perTreeOf(draft) === NONE
    ? { ...found, target: copy.INCENTIVE_RULE }
    : found;
};

/** The deadlines of step 2: the funding deadline is in the future, the claim deadline is not before it. */
const dateErrors = (draft: Draft, now: number): Errors => {
  const funding = Date.parse(draft.funding);
  const claim = Date.parse(draft.claim);

  return {
    ...(Number.isFinite(funding) && funding > now ? {} : { funding: copy.FUNDING_RULE }),
    ...(Number.isFinite(claim) && claim >= funding ? {} : { claim: copy.CLAIM_RULE }),
  };
};

/** What a step accepts: the information step, or the funding and schedule step (the review has nothing of its own). */
export const validate = (
  draft: Draft,
  step: 0 | 1,
  species: readonly string[],
  now: number,
): Errors =>
  step === 0
    ? { ...textErrors(draft, species), ...areaErrors(draft) }
    : { ...limitErrors(draft), ...moneyErrors(draft), ...dateErrors(draft, now) };

/** The open share of the slots, "75.00%", or "—" while the anchor share is not a share. */
export const openShare = (anchor: string): string => {
  const value = bps(anchor);

  return value === null || value > BPS
    ? '—'
    : `${(Number(BPS - value) / PERCENT_SCALE).toFixed(PERCENT_DIGITS)}%`;
};

/** The shares added up, "99.50", for the line under the budget inputs. */
export const totalShare = (shares: string[]): string =>
  (Number(sumOf(shares.map(bps))) / PERCENT_SCALE).toFixed(PERCENT_DIGITS);

/** The body of `POST /campaigns/metadata` (FR-077): trimmed text, the typed description, the non-empty URL lines. */
export const metadataBody = (draft: Draft, speciesCode: string) => ({
  title: draft.title.trim(),
  description: draft.description,
  speciesCode,
  regionName: draft.region.trim(),
  regionCenter: { lat: Number(draft.lat), lon: Number(draft.lon) },
  regionRadiusM: Number(draft.radius),
  imageUrls: lines(draft.urls),
});

/** A changed step-1 input is a new body, so a new save (FR-079): the key is the body itself. */
export const inputKey = (body: ReturnType<typeof metadataBody>): string => JSON.stringify(body);

type Axis = 'lon' | 'lat';

/** The standard geohash of a point, 7 characters (about 150 m): the bits alternate longitude and latitude, five to a character. */
export const geohash = (lat: number, lon: number): string => {
  const low: Record<Axis, number> = { lon: -LON_MAX, lat: -LAT_MAX };
  const high: Record<Axis, number> = { lon: LON_MAX, lat: LAT_MAX };
  const point = { lon, lat };
  const bits = Array.from({ length: GEOHASH_CHARS * BITS_PER_CHAR }, (_bit, index) => {
    const axis: Axis = index % 2 === 0 ? 'lon' : 'lat';
    const middle = (low[axis] + high[axis]) / 2;
    const up = point[axis] >= middle;

    low[axis] = up ? middle : low[axis];
    high[axis] = up ? high[axis] : middle;

    return up ? '1' : '0';
  }).join('');

  return Array.from({ length: GEOHASH_CHARS }, (_char, index) =>
    BASE32.charAt(parseInt(bits.slice(index * BITS_PER_CHAR, (index + 1) * BITS_PER_CHAR), 2)),
  ).join('');
};

const seconds = (text: string): bigint => BigInt(Math.floor(Date.parse(text) / SECOND_MS));

type ConfigInput = {
  draft: Draft;
  speciesCode: string;
  metadataURI: string;
  creator: Address;
  timeUnit: number;
};

/** The factory's `CampaignConfig` (campaigns.md §7): bps exactly, deadlines in Unix seconds, the same species code. */
export const configOf = ({ draft, speciesCode, metadataURI, creator, timeUnit }: ConfigInput) => {
  const [incentives, seedlings, verification, reserve, fee] = draft.splits.map((share) =>
    Number(bps(share)),
  );

  return {
    creator,
    metadataURI,
    speciesCode: stringToHex(speciesCode, { size: SPECIES_BYTES }),
    regionGeohash: stringToHex(geohash(Number(draft.lat), Number(draft.lon)), {
      size: GEOHASH_BYTES,
    }),
    regionRadiusM: Number(draft.radius),
    treeTarget: Number(draft.trees),
    anchorBps: Number(bps(draft.anchor)),
    perPlanterCap: Number(draft.cap),
    fundingTarget: units(draft.target) ?? NONE,
    fundingDeadline: seconds(draft.funding),
    claimDeadline: seconds(draft.claim),
    commitmentUnits: Number(draft.months),
    timeUnit: BigInt(timeUnit),
    split: {
      incentivesBps: incentives ?? 0,
      seedlingsBps: seedlings ?? 0,
      verificationBps: verification ?? 0,
      reserveBps: reserve ?? 0,
      feeBps: fee ?? 0,
    },
  };
};
