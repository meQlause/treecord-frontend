// Every sentence S09 (the retirement certificate) shows. Verbatim from the mockup (my-carbon.jsx:65-72,140-181), SRS
// §3.6.5, error-handling §4 or FR-012 (s09-certificate.md §9). A COPY id with no approved text is a lorem placeholder.
import type { RegistryStatus } from './certificate.api';

// ---- back link, heading ----
export const BACK_TO_CARBON = 'My carbon';

export const HERO_EYEBROW = 'RETIREMENT RECORD';

export const HERO_LINE = 'Retired,';

export const HERO_EM = 'for good.';

const COORD_LENGTH = 16;

export const recordCoord = (retirementId: string): string =>
  `RECORD / ${retirementId.toUpperCase().slice(0, COORD_LENGTH)}`;

// ---- states ----
export const NOT_FOUND_TITLE = 'Retirement record not found';

export const NOT_FOUND_BUTTON = 'Back to My carbon';

/** COPY-401: lorem until the owner approves the sentence (s09 state 10). */
export const COPY_FAILED = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

// ---- certificate ----
export const CERTIFICATE_LABEL = 'Certificate of retirement';

export const CERTIFICATE_EYEBROW = 'TREECORD · CERTIFICATE OF RETIREMENT';

export const certificateNumber = (retirementId: string): string => `No. ${retirementId}`;

export const CERTIFIES = 'This record certifies that';

export const REMOVAL_FROM = 'of carbon removal from';

export const issuedAs = (batchId: string, registry: string): string =>
  `, issued as batch #${batchId} under ${registry}, was permanently retired on behalf of`;

export const quoted = (purpose: string): string => `“${purpose}”`;

export const NO_PURPOSE = 'No purpose given';

export const LEDGER = 'Base Sepolia';

export const SIGNATURE = 'Treecord ledger';

export const REGISTRY_LABEL: Record<RegistryStatus, string> = { pending: 'Pending', done: 'Done' };

// ---- journey ----
export const JOURNEY = 'Retirement journey';

export const STEP_ISSUED = 'Issued';

export const STEP_HELD = 'Held';

export const STEP_RETIRED = 'Retired on-chain';

export const STEP_REGISTRY = 'Registry retirement';

export const vintageNote = (registry: string, vintage: number): string =>
  `${registry} · Vintage ${vintage}`;

// ---- on-chain record ----
export const RECORD_TITLE = 'On-chain record';

export const RECORD_EYEBROW = 'RETIREMENT';

export const CONFIRMED = 'Confirmed';

export const NOT_AVAILABLE = 'Not available yet';

export const batchFact = (batchId: string, registry: string, vintage: number): string =>
  `#${batchId} · ${vintageNote(registry, vintage)}`;

// ---- where it grew ----
export const WHERE_IT_GREW = 'Where it grew';

export const VIEW_CAMPAIGN = 'View campaign';

export const speciesMeta = (species: string, trees: number): string =>
  `${species} · ${trees} trees`;

// ---- stock card ----
export const STOCK_LABEL = 'Retired';

export const forBeneficiary = (beneficiary: string): string => `For ${beneficiary}`;

export const BATCH_ISSUED = 'Batch issued';

export const shareOfBatch = (batchId: string): string => `Share of batch #${batchId}`;

export const CLAIMED = 'Claimed for good';

export const STOCK_NOTE =
  'Retired tonnes leave circulation; they can’t be bought or retired again.';

// ---- status panel ----
export const PANEL_TITLE = 'Record status';

export const PANEL_EYEBROW = 'RETIREMENT · BASE SEPOLIA';

export const ON_CHAIN = 'On-chain retirement';

export const confirmedOn = (day: string): string => `Confirmed · ${day}`;

export const registryLine = (
  status: RegistryStatus,
  registry: string,
  reference: string | null,
): string =>
  status === 'done'
    ? ['Done', reference].filter((part) => part !== null).join(' · ')
    : `Pending · updates when ${registry} confirms`;

export const RECORD_ID = 'Record ID';

export const COPY_LINK = 'Copy record link';

export const LINK_COPIED = 'Link copied';

export const PRINT = 'Print certificate';

export const batchLink = (batchId: string): string => `Batch #${batchId}`;

export const CAMPAIGN = 'Campaign';

export const PANEL_NOTE = 'Retired credits can’t be moved or resold.';
