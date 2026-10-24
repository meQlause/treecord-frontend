// S03's rules (s03-campaigns.md §2, §4) and the two formats S03 and S04 share. No React here.
import {
  ALL_CAMPAIGNS,
  CARD_META,
  DEADLINE_PASSED,
  STATUS_FILTERS,
  daysLeft,
} from './campaigns.copy';
import type { CampaignItem, CatalogFilters, Species } from './campaigns.api';

const MICRO = 1_000_000n;
const MICRO_DIGITS = 6;
const BPS_PER_PERCENT = 100;
const REGION_MAX = 120;

type StatusFilter = (typeof STATUS_FILTERS)[number];

const GROUPED = new Intl.NumberFormat('en-US');

/** USDC base units (a decimal string, 6 decimals) → "6,840" / "17.5": bigint all the way, trailing zeros trimmed. */
export const usdc = (units: string | bigint): string => {
  const value = BigInt(units);
  const whole = GROUPED.format(value / MICRO);
  const fraction = (value % MICRO)
    .toString()
    .padStart(MICRO_DIGITS, '0')
    .replace(/0{1,6}$/, '');

  return fraction === '' ? whole : `${whole}.${fraction}`;
};

/** `progressBps` → the whole percent the card and the ring print. */
export const percentOf = (progressBps: number): number => Math.round(progressBps / BPS_PER_PERCENT);

/** An unknown `?status=` value is "All campaigns" (FR-032). */
export const parseStatus = (raw: string | null): StatusFilter =>
  STATUS_FILTERS.find((label) => label === raw) ?? ALL_CAMPAIGNS;

/** The trimmed, 1-120 character region, or `undefined` (no filter). */
export const parseRegion = (raw: string | null): string | undefined => {
  const region = (raw ?? '').trim().slice(0, REGION_MAX).trim();

  return region === '' ? undefined : region;
};

export type UrlFilters = { status: StatusFilter; species: string; region: string };

/** What the request carries: `status` lower-case, `species` as the code of the named species. */
export const requestFilters = (
  { status, species, region }: UrlFilters,
  list: readonly Species[] | undefined,
): CatalogFilters => ({
  status: status === ALL_CAMPAIGNS ? undefined : status.toLowerCase(),
  species: list?.find((item) => item.name === species)?.code,
  region: region === '' ? undefined : region,
});

/** Card meta (s03 §2): a client lookup on `status`; `funding` reads the deadline. */
export const cardMeta = (item: Pick<CampaignItem, 'status' | 'daysLeft'>): string => {
  if (item.status !== 'funding') {
    return CARD_META[item.status];
  }

  return item.daysLeft === null ? DEADLINE_PASSED : daysLeft(item.daysLeft);
};

export type CatalogView = 'loading' | 'error' | 'empty' | 'filtered-empty' | 'ready';

type ViewInput = {
  /** Page 1 failed, or the species list failed while the URL names a species. */
  failed: boolean;
  pending: boolean;
  /** Offline and nothing cached: the request waits for a network that is not there (C-17). */
  paused: boolean;
  total: number | undefined;
  filtered: boolean;
};

/** Which of s03 §3's page states to draw. */
export const catalogView = ({
  failed,
  pending,
  paused,
  total,
  filtered,
}: ViewInput): CatalogView => {
  if (failed || (pending && paused)) {
    return 'error';
  }

  if (pending || total === undefined) {
    return 'loading';
  }

  if (total > 0) {
    return 'ready';
  }

  return filtered ? 'filtered-empty' : 'empty';
};

/** The bar's width: the exact share, the Progress clamps it to 100. */
export const barPercent = (progressBps: number): number => progressBps / BPS_PER_PERCENT;

type PageOf = { items: CampaignItem[]; total: number };

/** Every loaded page as one list; `total` is the newest answer's (the filters do not change between pages). */
export const flattenPages = (pages: readonly PageOf[] | undefined) => ({
  items: pages?.flatMap((page) => page.items) ?? [],
  total: pages?.at(-1)?.total,
});

/** `current` with `name` set to `value`; "" and "All campaigns" remove it, so the default never reaches the URL. */
export const withParam = (
  current: URLSearchParams,
  name: 'status' | 'species' | 'region',
  value: string,
): URLSearchParams => {
  const next = new URLSearchParams(current);

  if (value === '' || value === ALL_CAMPAIGNS) {
    next.delete(name);
  } else {
    next.set(name, value);
  }

  return next;
};

/** What the URL means once the species list is known (an unknown species name is "All species"). */
export const filterState = (
  url: UrlFilters,
  request: CatalogFilters,
  list: readonly Species[] | undefined,
) => {
  const known = request.species !== undefined;

  return {
    selectedSpecies: known ? url.species : '',
    active: url.status !== ALL_CAMPAIGNS || known || url.region !== '',
    // the request waits for the list when the URL names a species
    waiting: url.species !== '' && list === undefined,
  };
};
