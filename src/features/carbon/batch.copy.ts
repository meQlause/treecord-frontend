// Every sentence S08 (the batch page) shows. Verbatim from the mockup (carbon.jsx:40-53,165-197,203-260), SRS §3.6.3,
// FR-003, FR-006 or FR-012 (s08-batch.md §9). The buy panel's transaction sentences join this file with D08 (F2b).

// ---- back link, heading ----
export const BACK_TO_CATALOG = 'Carbon credits';

export const HERO_EYEBROW = 'ISSUED BATCH';

export const HERO_LINE = 'Batch';

export const batchNumber = (batchId: string): string => `#${batchId}`;

export const batchCoord = (batchId: string, registry: string): string =>
  `BATCH #${batchId} / ${registry.toUpperCase()}`;

// ---- states ----
export const NOT_FOUND_TITLE = 'Batch not found';

export const NOT_FOUND_BUTTON = 'Browse batches';

// ---- provenance ----
export const provenanceMeta = (registry: string, vintage: number, species: string): string =>
  `${registry} · Vintage ${vintage} · ${species}`;

// ---- journey ----
export const JOURNEY = 'Credit journey';

export const journeyLabel = (steps: readonly (readonly [string, string])[]): string =>
  steps.map(([label, note]) => `${label}: ${note}`).join('. ');

export const STEP_PLANTED = 'Planted';

export const STEP_VERIFIED = 'Survival verified';

export const STEP_EVIDENCE = 'Field evidence';

export const issuanceStep = (registry: string): string => `${registry} issuance`;

export const STEP_MIRRORED = 'Mirrored on-chain';

export const STEP_NETWORK = 'Base Sepolia';

export const STEP_AVAILABLE = 'Available';

// ---- batch provenance record ----
export const RECORD_TITLE = 'Batch provenance';

export const RECORD_EYEBROW = 'REGISTRY RECORD';

export const ISSUED_ON = 'Issued on';

// ---- stock card ----
export const STOCK_LABEL = 'Batch stock';

export const STOCK_CAPTION = 'Available inventory';

export const TOTAL_ISSUED = 'Total issued';

export const STILL_AVAILABLE = 'Still available';

export const stockNote = (batchId: string, vintage: number): string =>
  `Batch #${batchId} · Vintage ${vintage}`;

export const STOCK_FOOT = 'Issued credits only; reserved credits are not for sale.';

// ---- buy panel (D08) ----
export const BUY_TITLE = 'Buy credits';

export const BUY_EYEBROW = 'YOUR WALLET · BASE SEPOLIA';

export const PER_TONNE = 'USDC / tonne';

export const AMOUNT_LABEL = 'Amount · tCO₂e';

export const MAX = 'Max';

export const TOTAL = 'Total';

export const USDC = 'USDC';

export const GAS_NOTE = 'Network gas is separate.';

export const BUY_NOTE = 'Issued credits. No secondary resale.';

export const NO_VALUE = '—';
