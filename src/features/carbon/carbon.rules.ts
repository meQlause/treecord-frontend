// S07's rules (s07-carbon.md §2, §4, §6). No React here. Amounts are decimal strings (REG-001), parsed with BigInt.
import { usdc } from '../../shared/format/money';
import type { CarbonBatch } from './carbon.api';
import {
  ALL_BATCHES,
  AVAILABILITY_LABEL,
  SOLD_OUT_SUFFIX,
  STATUS_FILTERS,
  pricePerTonne,
} from './carbon.copy';

type StatusFilter = (typeof STATUS_FILTERS)[number];

const PERCENT = 100;
const CHIPS = 10;
const ZERO = 0n;

/** An unknown `?status=` value is "All batches". */
export const parseStatus = (raw: string | null): StatusFilter =>
  STATUS_FILTERS.find((label) => label === raw) ?? ALL_BATCHES;

/** The distinct registries in list order: the options of "Filter by registry". */
export const registriesOf = (batches: readonly CarbonBatch[]): string[] => [
  ...new Set(batches.map(({ registry }) => registry)),
];

/** A `?registry=` the list does not hold is "All registries". */
export const parseRegistry = (raw: string | null, registries: readonly string[]): string =>
  registries.find((registry) => registry === raw) ?? '';

export type Filters = { status: StatusFilter; registry: string; query: string };

/** True when any control is off its default; the text counts trimmed. */
export const isFiltered = ({ status, registry, query }: Filters): boolean =>
  status !== ALL_BATCHES || registry !== '' || query.trim() !== '';

/** FR-219: status by the server's `availability`, registry by name, text over "{title} {region}", all in the browser. */
export const filterBatches = (
  batches: readonly CarbonBatch[],
  { status, registry, query }: Filters,
): CarbonBatch[] => {
  const needle = query.trim().toLowerCase();

  return batches.filter(
    ({ availability, registry: own, campaign }) =>
      (status === ALL_BATCHES || AVAILABILITY_LABEL[availability] === status) &&
      (registry === '' || own === registry) &&
      (needle === '' || `${campaign.title} ${campaign.region}`.toLowerCase().includes(needle)),
  );
};

/** `current` with `name` set to `value`; "" and "All batches" remove it, so a default never reaches the URL. */
export const withParam = (
  current: URLSearchParams,
  name: 'status' | 'registry' | 'q',
  value: string,
): URLSearchParams => {
  const next = new URLSearchParams(current);

  if (value === '' || value === ALL_BATCHES) {
    next.delete(name);
  } else {
    next.set(name, value);
  }

  return next;
};

/** Display maths: the share of the batch still on sale (carbon.md §1). A batch that issued nothing has none. */
const ratio = ({ inventoryAmount, issuedAmount }: CarbonBatch): number =>
  BigInt(issuedAmount) === ZERO ? 0 : Number(inventoryAmount) / Number(issuedAmount);

export const sharePercent = (batch: CarbonBatch): number => Math.round(ratio(batch) * PERCENT);

/** The ten decorative chips lit by what is still available. */
export const litChips = (batch: CarbonBatch): number => Math.round(ratio(batch) * CHIPS);

/** Price line (s07 §2): no usable price shows the availability; a price shows it, with the sold-out suffix. */
export const priceLine = ({ usdcPerTonne, availability }: CarbonBatch): string => {
  if (usdcPerTonne === null || BigInt(usdcPerTonne) === ZERO) {
    return AVAILABILITY_LABEL[availability];
  }

  return `${pricePerTonne(usdc(usdcPerTonne))}${availability === 'sold_out' ? SOLD_OUT_SUFFIX : ''}`;
};

export type CatalogView = 'loading' | 'error' | 'empty' | 'filtered-empty' | 'ready';

/** Which of s07 §3's page states to draw. */
export const catalogView = (
  query: { isPending: boolean; isError: boolean },
  loaded: number,
  shown: number,
): CatalogView => {
  if (query.isError) {
    return 'error';
  }

  if (query.isPending) {
    return 'loading';
  }

  if (loaded === 0) {
    return 'empty';
  }

  return shown > 0 ? 'ready' : 'filtered-empty';
};
