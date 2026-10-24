// Every sentence S06 shows (docs/FE/features/s06-report.md). Verbatim from the mockup (report.jsx) or the SRS; a
// `{ copyId }` is a lorem placeholder until the owner approves the sentence (conventions §9).
import { number } from '../../shared/format/number';

export type Message = string | { copyId: string };

// ---- heading ----
export const EYEBROW = 'CAMPAIGN IMPACT REPORT';

export const COORDINATE = '03 / THE RECORD';

export const BACK_TO_CAMPAIGN = 'Back to campaign';

export const ALL_CAMPAIGNS = 'All campaigns';

export const AS_OF = 'As of';

export const CAMPAIGN_WIDE = 'Campaign-wide totals';

// ---- R-1 .. R-3 ----
export const LOADING = 'Loading impact report…';

export const UNAVAILABLE_TITLE = 'Report unavailable';

export const UNAVAILABLE_BODY = 'Campaign totals could not be loaded.';

export const TRY_AGAIN = 'Try again';

export const NOT_FOUND_TITLE = 'Report not found';

export const NOT_FOUND_BODY = 'This campaign is not in the catalog.';

// ---- overview ----
export const OVERVIEW_LABEL = 'Impact overview';

export const PLANTING_KICKER = '01 · The planting';

export const MONEY_KICKER = '02 · The money';

export const TREES_TITLE = ['Trees,', 'rooted'] as const;

export const MONEY_TITLE = ['Where it', 'flows'] as const;

export const plantedCaption = (target: number): string => `OF ${number(target)} PLANTED`;

export const SURVIVAL_CAPTION = 'SURVIVAL';

export const NO_SURVIVAL = '—';

export const FLAGGED_CAPTION = 'FLAGGED';

export const MONEY_CAPTIONS = ['USDC RAISED', 'CONTRIBUTORS', 'USDC TO PLANTERS'] as const;

export const treesLabel = (planted: number, survival: string, flagged: number): string =>
  `${number(planted)} trees planted, survival ${survival}, ${number(flagged)} flagged`;

export const moneyLabel = (raised: string, contributors: number, paid: string): string =>
  `${raised} USDC raised from ${number(contributors)} contributors; ${paid} USDC paid to planters`;

// ---- tree health ----
export const HEALTH_TITLE = 'Tree health';

export const NO_AGE_NOTE = 'Mutually exclusive statuses';

export const averageAge = (days: number): string => `Average age ${number(days)} days`;

export const HEALTH_NOTE =
  'Survival includes alive, flagged, and completed trees. Counts belong to this campaign.';

// ---- funding ----
export const FUNDING_TITLE = 'Funding';

export const FUNDING_LABEL = 'Funding';

export const TOTAL_RAISED = 'Total raised';

export const USDC = 'USDC';

export const LEDGER = {
  target: 'Funding target',
  contributors: 'Unique contributors',
  refunded: 'Total refunded',
  commitment: 'Commitment',
  radius: 'Planting radius',
} as const;

export const months = (count: number): string => `${count} months`;

export const meters = (radius: number): string => `${number(radius)} m`;

// ---- planter incentives ----
export const INCENTIVES_TITLE = 'Planter incentives';

export const PAID = 'Paid';

export const FORFEITED = 'Forfeited';

export const BARS_CAPTION = 'Recorded payouts by milestone';

export const paidCount = (payouts: number): string => `${number(payouts)} paid`;

export const UPCOMING = 'upcoming';

export const NO_PAYOUTS = 'No milestone payouts yet.';

export const barsLabel = (rows: readonly string[]): string => `${BARS_CAPTION}: ${rows.join('; ')}`;

export const barRow = (month: number, payouts: number, amount: string): string =>
  `month ${month}, ${payouts} payouts, ${amount} USDC`;

// ---- carbon ----
export const CARBON_TITLE = 'Carbon';

export const PRE_CERTIFICATION = 'PRE-CERTIFICATION';

export const ISSUED_CREDITS = 'ISSUED CREDITS';

export const ESTIMATE = 'Campaign estimate';

export const NOT_ESTIMATED = 'Not estimated';

export const TONNES = 'tCO₂e';

/** COPY-420: the method label before "· {model}". */
export const METHOD_LABEL = { copyId: 'COPY-420' } as const;

export const NO_ESTIMATE_NOTE =
  'No estimate or method available. Estimates are not issued credits.';

export const estimateNote = (units: string): string =>
  `${units} units. Estimates are not issued credits.`;

export const TOTAL_ISSUED = 'Total issued';

export const RETIRED = 'Retired';

export const issuedNote = (issued: string, retired: string): string =>
  `${issued} issued units · ${retired} retired units. 1,000 units = 1 tCO₂e.`;

export const FUNNEL_KEYS = ['Estimate', 'Issued', 'Retired'] as const;

export const BATCHES_CAPTION = 'Issuance batches';

export const BATCH_HEADERS = [
  'Batch / registry',
  'Vintage',
  'Serial range',
  'Issued (tCO₂e)',
  'Transaction',
] as const;

export const NO_ISSUANCE = 'No carbon has been issued.';

// ---- evidence ----
export const EVIDENCE_TITLE = 'Evidence';

export const EVIDENCE_NOTE = 'Public records only';

export const ROSTER_NOTE = 'This is not a complete tree roster.';

export const EVIDENCE_CAPTION = 'Evidence record';

export const EVIDENCE_HEADERS = [
  'Tree',
  'Event',
  'Time',
  'Evidence hash',
  'Block / transaction',
] as const;

export const NO_EVIDENCE = 'No public evidence available.';

/** COPY-166 / COPY-168: lorem until approved; COPY-167 is drawn as the shared "Loading…". */
export const MORE_LABEL = { copyId: 'COPY-166' } as const;

export const MORE_FAILED = { copyId: 'COPY-168' } as const;

export const EVENT_PLANTED = 'Tree planted';

/** COPY-169 / COPY-170 / COPY-171: the event labels the mockup never wrote. */
export const EVENT_DIED = { copyId: 'COPY-169' } as const;

export const EVENT_REPLANTED = { copyId: 'COPY-170' } as const;

export const EVENT_CHECK_IN_NO_MONTH = { copyId: 'COPY-171' } as const;

export const checkIn = (month: number): string => `Survival check · month ${month}`;

// ---- foot ----
export const CAMPAIGN_ADDRESS = 'Campaign address';
