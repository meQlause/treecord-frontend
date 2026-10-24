// Every sentence S07 (the carbon catalog) shows. Verbatim from the mockup (carbon.jsx:42-69), SRS §3.6.2 or FR-012
// (s07-carbon.md §8: no placeholders).
import type { Availability } from './carbon.api';

// ---- hero and catalog ----
export const HERO_EYEBROW = 'CARBON CREDITS';

export const HERO_LINE_ONE = 'Every tonne';

export const HERO_LINE_TWO = 'traces to';

export const HERO_EM = 'a tree.';

export const HERO_COORD = '02 / THE PROOF';

export const CATALOG_TITLE = 'Issued batches';

export const CATALOG_KICKER = 'Every tonne, one owner.';

export const ALL_BATCHES = 'All batches';

export const STATUS_FILTERS = [
  ALL_BATCHES,
  'Available',
  'Sold out',
  'Sales paused',
  'Price not set',
] as const;

export const STATUS_FILTERS_LABEL = 'Batch availability';

export const REGISTRY_FILTER_LABEL = 'Filter by registry';

export const ALL_REGISTRIES = 'All registries';

export const QUERY_FILTER_LABEL = 'Filter by campaign or region';

export const QUERY_PLACEHOLDER = 'Campaign or region';

export const CLEAR_SEARCH = 'Clear search';

export const CLEAR_FILTERS = 'Clear filters';

export const NEWEST_FIRST = 'Newest first';

export const batchCount = (shown: number, loaded: number): string =>
  shown < loaded ? `${shown} batches of ${loaded}` : `${shown} batches`;

// ---- states ----
export const LOADING = 'Loading issued batches…';

export const EMPTY_TITLE = 'No issued batches yet';

export const FILTERED_TITLE = 'No batches match these filters';

export const FAILED_TITLE = 'Couldn’t load carbon credits';

export const TRY_AGAIN = 'Try again';

export const UNIT = 'tCO₂e';

// ---- batch record ----
export const serialRange = (batchId: string): string => `SERIAL RANGE · BATCH #${batchId}`;

// ---- card ----
export const ISSUED = 'Issued';

export const VIEW_BATCH = 'View batch';

export const batchTag = (batchId: string): string => `Batch #${batchId}`;

export const viewBatchLabel = (batchId: string, title: string): string =>
  `View batch ${batchId}: ${title}`;

export const vintageLine = (vintage: number): string => `Vintage ${vintage}`;

export const INVENTORY_PROGRESS = 'Inventory available';

export const AVAILABLE_UNIT = 'tCO₂e available';

export const issuedLine = (tonnes: string): string => `of ${tonnes} tCO₂e issued`;

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: 'Available',
  sold_out: 'Sold out',
  sales_paused: 'Sales paused',
  price_not_set: 'Price not set',
};

export const SOLD_OUT_SUFFIX = ' · Sold out';

export const pricePerTonne = (usdc: string): string => `${usdc} USDC / tonne`;
