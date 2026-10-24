// Every sentence S05 shows outside the D07 form (docs/FE/features/s05-tree.md). Verbatim from the mockup
// (shared-pages.jsx) or the SRS; a `{ copyId }` is a lorem placeholder until the owner approves the sentence.

export type Message = string | { copyId: string };

// ---- heading ----
export const EYEBROW = 'EVERY TREE, PROVEN';

export const HEADING = 'Tree';

export const coordinate = (id: string, region: string): string =>
  `TREE #${id} / ${region.toUpperCase()}`;

// ---- T-2 ----
export const notFoundTitle = (id: string): string => `Tree #${id} doesn’t exist`;

export const NOT_FOUND_BODY = 'No campaign issues this tree id.';

export const CAMPAIGNS = 'Campaigns';

// ---- provenance ----
export const VIEW_CAMPAIGN = 'View campaign';

export const provenance = (species: string, planted: string): string =>
  `${species} · planted ${planted}`;

// ---- statuses ----
export const STATUS_LABEL: Readonly<Record<string, string>> = {
  alive: 'Alive',
  flagged: 'Flagged',
  dead: 'Dead',
  removed: 'Removed',
  completed: 'Completed',
  paid: 'Paid',
  open: 'Open',
  upcoming: 'Upcoming',
  missed: 'Missed',
  paused: 'Paused',
  forfeited: 'Forfeited',
  upheld: 'Upheld',
  dismissed: 'Dismissed',
};

// ---- timeline ----
export const TIMELINE_TITLE = 'Evidence timeline';

export const NO_EVENTS = 'No indexed events';

export const PLANTED = 'Planted';

export const PLANTED_NOTE = 'Tree planted.';

export const CHECK_IN_NOTE = 'Milestone paid.';

export const STATUS_NOTE = 'Status updated.';

export const checkInTitle = (month: number): string => `Survival check · month ${month}`;

/** COPY-176 / COPY-159 / COPY-160: the titles the mockup never wrote. */
export const CHECK_IN_NO_MONTH = { copyId: 'COPY-176' } as const;

export const REPLANTED = { copyId: 'COPY-159' } as const;

export const FLAG_RESOLVED = { copyId: 'COPY-160' } as const;

/** COPY-161…164: the evidence details under a row. */
export const SCORE_LABEL = { copyId: 'COPY-161' } as const;

export const HASH_LABEL = { copyId: 'COPY-162' } as const;

export const TX_LABEL = { copyId: 'COPY-163' } as const;

// ---- milestones ----
export const SCHEDULE_TITLE = 'Milestone schedule';

export const SCHEDULE_HEADERS = ['Milestone', 'Window', 'Amount', 'Status'] as const;

export const month = (count: number): string => `Month ${count}`;

export const AMOUNT_UNIT = 'USDC';

export const SIGNED_IN_NOTE = 'Chain windows, pause duration and settlement decide each payout.';

// ---- payouts ----
export const PAYOUTS_TITLE = 'Payouts & forfeits';

export const FACTS = {
  recorded: 'Recorded payouts',
  planter: 'Planter / transaction',
  forfeited: 'Forfeited',
} as const;

export const NONE = 'None';

export const FORFEITED_NOTE = 'Unpaid milestones forfeited';

export const recorded = (paid: number, amount: string): string =>
  `${paid} milestone${paid === 1 ? '' : 's'} · ${amount} USDC`;

// ---- flags ----
export const FLAGS_TITLE = 'Flags';

export const NO_FLAGS = 'No on-chain flags.';

export const FLAG_FACTS = {
  flag: 'Flag',
  status: 'Status',
  reason: 'Reason',
  resolution: 'Resolution',
} as const;

export const NOT_RESOLVED = 'Not resolved';

export const RESOLVE_FLAG = 'Resolve flag';

export const pending = (reason: string): string =>
  `Pending · ${reason}${/[.!?]$/.test(reason) ? '' : '.'} Reason saved; no on-chain flag or pause yet.`;

// ---- D07 Flag tree (s05-tree.md §3.4) ----
export const FLAG_REASON = 'Flag reason';

/** COPY-410: the rule, stated up front in the label. */
export const FLAG_RULE_COPY = 'COPY-410';

export const FLAG_TREE = 'Flag tree';

export const FLAG_SUMMARY = 'Save your reason. Payouts pause only after an on-chain flag.';

export const FLAG_SENT = 'Done. Flag tree is on its way; its status updates here.';

export const REASON_SAVED = 'Reason saved';

export const FLAG_OPENED = 'Flag opened';

export const SAVING = 'Saving your reason…';

export const WALLET_LINE = 'Confirm in your wallet';

/** COPY-165: the button that sends the wallet step again. */
export const RETRY_FLAG_COPY = 'COPY-165';

export const NOT_CONTRIBUTOR_COPY = 'COPY-007';

export const NOT_FLAGGABLE_COPY = 'COPY-015';

export const UNAVAILABLE =
  'Could not load this page · Your inputs and local records are unchanged.';

export const WALLET_PENDING = 'Your wallet is still being prepared. Try again in a moment.';

export const TRY_AGAIN = 'Try again';

export const CONFIRM = 'Confirm';

export const CANCEL = 'Cancel';

// ---- lifecycle ----
export const LIFECYCLE = {
  label: 'Lifecycle',
  caption: 'Milestones paid',
  unit: 'milestones',
  sub: 'Paid to planter',
  share: 'Growth to month 36',
} as const;

export const TOTAL_MILESTONES = 6;

export const MONTHS_TO_GROW = 36;

export const shareNote = (status: string, monthNumber: number): string =>
  `${status} · month ${monthNumber}`;

export const lifecycleNote = (perTree: string, flagged: boolean): string =>
  `Of ${perTree} USDC per tree; ${
    flagged ? 'the payout clock is paused by a flag.' : 'payouts follow the milestone windows.'
  }`;

// ---- record ----
export const RECORD = {
  title: 'Tree record',
  eyebrow: 'LOCATION & LIFECYCLE',
  location: 'Location',
  region: 'Region',
  planted: 'Planted',
  tag: 'Tree tag',
  replant: 'Replant deadline',
  clock: 'Payout clock',
} as const;

export const NO_TAG = 'None issued';

export const REPRINT = 'Reprint';

export const CLOCK_PAUSED = 'Paused';

export const CLOCK_WINDOWS = 'Milestone windows';

export const APPROXIMATE = 'Approximate';

export const LOCATION_NOTE = 'The exact location isn’t public; art is not a location map.';

export const reprintLine = (id: string, title: string): string => `Tree #${id} · ${title}`;

// ---- planter actions ----
export const RECORD_CHECK_IN = 'Record check-in';

export const RECORD_REPLANT = 'Record replant';

export const REPORT_DEAD = 'Report dead';

export const IMPACT_REPORT = 'Impact report';

export const liveCheckIn = (monthNumber: number, status: string): string =>
  `Month ${monthNumber} check-in · ${status.replaceAll('_', ' ')}`;
