// Every sentence S03 (catalog) and S04 (campaign page) show. Verbatim from the mockup (main.jsx), the SRS or
// error-handling §4; a COPY id with no approved text is a lorem placeholder (conventions §9).

// ---- shared ----
/** COPY-157: lorem until the owner approves the sentence. One constant for S03, S04, S05, S06, S13. */
export const UNTITLED_CAMPAIGN = 'Lorem ipsum';

export const STATUS_LABEL = {
  funding: 'Funding',
  active: 'Active',
  refunding: 'Refunding',
  completed: 'Completed',
} as const;

export const TRY_AGAIN = 'Try again';

// ---- S03 hero and catalog ----
export const HERO_EYEBROW = 'EVERY TREE, PROVEN';

export const HERO_LINE_ONE = 'Good things';

export const HERO_LINE_TWO = 'start with';

export const HERO_EM = 'a tree.';

export const HERO_COORD = '01 / THE BEGINNING';

export const STAMP_TOP = 'GROWING';

export const STAMP_BOTTOM = 'together.';

export const CATALOG_TITLE = 'Campaigns';

export const CATALOG_KICKER = 'Small starts. Lasting roots.';

export const ALL_CAMPAIGNS = 'All campaigns';

export const STATUS_FILTERS = [
  ALL_CAMPAIGNS,
  STATUS_LABEL.funding,
  STATUS_LABEL.active,
  STATUS_LABEL.completed,
  STATUS_LABEL.refunding,
] as const;

export const STATUS_FILTERS_LABEL = 'Campaign status';

export const SPECIES_FILTER_LABEL = 'Filter by species';

export const ALL_SPECIES = 'All species';

export const REGION_FILTER_LABEL = 'Filter by region';

export const REGION_PLACEHOLDER = 'Filter region';

export const CLEAR_REGION = 'Clear region';

export const CLEAR_FILTERS = 'Clear filters';

export const NEWEST_FIRST = 'Newest first';

export const LOADING_META = 'Finding your next forest…';

export const ERROR_META = 'Campaigns unavailable';

export const LOADING_GRID = 'Loading campaigns';

export const campaignCount = (shown: number, total: number): string =>
  total > shown ? `${shown} campaigns of ${total}` : `${shown} campaigns`;

export const loadedLine = (shown: number, total: number): string =>
  `${shown} of ${total} campaigns`;

// ---- S03 empty, error, paging, offline ----
export const EMPTY_EYEBROW = 'ROOM TO GROW';

export const EMPTY_TITLE = 'The next forest starts here';

export const EMPTY_BODY = 'No campaigns to show yet.';

export const FILTERED_TITLE = 'No matching campaigns';

export const FILTERED_BODY = 'Try another species, region, or status.';

export const FAILED_EYEBROW = 'A LITTLE HICCUP';

export const FAILED_TITLE = 'Couldn’t load campaigns';

export const FAILED_BODY = 'Please try again.';

export const LOAD_MORE = 'Load more campaigns';

export const LOAD_MORE_BUSY = 'Loading…';

export const MORE_FAILED = 'Couldn’t load more. Your campaigns are still here.';

export const OFFLINE_CACHED = 'You’re offline · Showing cached campaigns';

export const REFRESH = 'Refresh';

export const REFRESHED = 'Campaigns refreshed';

// ---- S03 card ----
export const VIEW_CAMPAIGN = 'View campaign';

export const viewCampaignLabel = (title: string): string => `${VIEW_CAMPAIGN}: ${title}`;

export const FUNDING_PROGRESS = 'Funding progress';

export const CARD_META = {
  active: 'Growing now',
  completed: 'Commitment complete',
  refunding: 'Funding ended',
} as const;

export const DEADLINE_PASSED = 'Deadline passed';

export const daysLeft = (days: number): string => `${days} days left`;

export const monthsLabel = (months: number): string => `${months} months`;

// ---- S04 page ----
export const BACK_TO_CAMPAIGNS = 'All campaigns';

export const NOT_FOUND_TITLE = 'Campaign not found';

export const NOT_FOUND_BUTTON = 'Back to campaigns';

export const NOT_FOUND_DOCUMENT = 'Not found';

export const COPIED = 'Campaign address copied';

export const COPY_BLOCKED = 'Couldn’t copy. Select the address to copy it.';

const NETWORK_NAMES: Readonly<Record<number, string>> = { 84532: 'Base Sepolia' };

export const networkName = (chainId: number): string =>
  NETWORK_NAMES[chainId] ?? `Chain ${chainId}`;

// ---- S04 facts and sections ----
export const FACT_TREES = 'Tree target';

export const FACT_COMMITMENT = 'Commitment';

export const FACT_RADIUS = 'Region radius';

export const FACT_NETWORK = 'Network';

export const radiusLabel = (meters: string): string => `${meters} m`;

export const BUDGET_TITLE = 'Where the funding goes';

export const budgetOf = (target: string): string => `Of ${target} USDC`;

export const BUDGET_LABEL: Readonly<Record<string, string>> = {
  incentives: 'Planter incentives',
  seedlings: 'Seedlings',
  verification: 'Verification',
  reserve: 'Replacement reserve',
  fee: 'Platform fee',
};

export const SCHEDULE_TITLE = 'Paid for staying alive';

export const SCHEDULE_KICKER = 'Incentive schedule';

const PLANT_STOP = 'Plant';

export const stopLabel = (month: number): string => (month === 0 ? PLANT_STOP : `M${month}`);

const PAYOUT_COUNT: readonly string[] = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

const stopWhen = (month: number): string => (month === 0 ? 'planting' : `month ${month}`);

/** The SVG's accessible name: "Six incentive payouts over 36 months: 10% at planting, 10% at month 3, …". */
export const trackLabel = (
  stops: readonly (readonly [month: number, share: number])[],
  lastMonth: number,
): string => {
  const list = stops.map(([month, share]) => `${share}% at ${stopWhen(month)}`).join(', ');
  const count = PAYOUT_COUNT[stops.length] ?? String(stops.length);

  return `${count} incentive payouts over ${lastMonth} months: ${list}.`;
};

export const PLANTING_TITLE = 'Planting overview';

export const PLANTING_SUBTITLE = {
  funding: 'Planting starts once funded',
  active: 'Planting in progress',
  refunding: STATUS_LABEL.refunding,
  completed: STATUS_LABEL.completed,
} as const;

export const SLOTS_ANCHOR = 'Anchor slots';

export const SLOTS_OPEN = 'Open allocation';

export const SLOTS_PLANTED = 'Planted';

// ---- S04 funding panel ----
export const FUNDED = 'funded';

export const USDC = 'USDC';

export const raisedOf = (target: string): string => `raised of ${target} USDC`;

export const FUNDING_DEADLINE = 'Funding deadline';

export const CLAIM_DEADLINE = 'Claim deadline';

export const CLOSED = 'Closed';

export const PREVIEW_LABEL = 'Contribution preview';

export const PLANTING_PROGRESS = 'Planting progress';

export const TRY_AMOUNT = 'Try an amount';

export const AMOUNT_GROUP = 'Amount';

export const previewTrees = (trees: number): string =>
  `≈ ${trees} ${trees === 1 ? 'tree' : 'trees'}`;

export const previewShare = (usdc: string): string =>
  `${usdc} USDC paid to planters as the trees survive`;

export const plantedOf = (planted: string, trees: string): string => `${planted} of ${trees}`;

export const VERIFIED = 'trees verified in the field';

export const ENDED_LINE = {
  funding: 'Funding deadline passed · refunds can start',
  active: 'Funding complete',
  refunding: 'Refunds available to contributors',
  completed: 'Funding complete',
} as const;

export const CONTRACT_LABEL = 'Campaign address';

export const COPY_ADDRESS = 'Copy full campaign address';

export const FULL_ADDRESS = 'Full address';

export const IMPACT_REPORT = 'Impact report';

export const DETAIL_NOTE = 'Every tree, proven.';

// ---- S04 call to action (FR-041) ----
export const CTA_PLANTER = 'Claim open slots';

export const CTA_OPERATOR = 'Open operations';

export const CTA_AUDITOR = 'See campaign actions';

export const ctaDonor = (amount: number): string => `Contribute ${amount} USDC`;

export const signInToContribute = (amount: number): string =>
  `Sign in to contribute ${amount} USDC`;

// ---- S04 "Campaign actions" panel (read states) ----
export const ACTIONS_TITLE = 'Campaign actions';

export const WALLET_PENDING = 'Your wallet is still being prepared. Try again in a moment.';

export const START_REFUND = 'Start refund';

export const DONOR_ACTIVE = 'Funding complete. Follow the campaign impact report.';

export const READ_ONLY = 'Campaign read-only for this account.';

// ---- S04 wallet actions: D04 Contribute, Start refund, D05 Claim refund (s04-campaign.md §3.4-§3.6) ----
export const CONTRIBUTION_LABEL = 'Contribution · USDC';

/** COPY-409: the amount rule, shown after the label. */
export const AMOUNT_RULE = 'COPY-409';

export const CONTRIBUTE = 'Contribute';

export const CONFIRM = 'Confirm';

export const CANCEL = 'Cancel';

export const CLOSE = 'Close';

export const reviewOf = (action: string): string => `Review ${action}`;

export const fromWallet = (usdcText: string): string => `${usdcText} USDC from your wallet.`;

export const FACT_ALLOWANCE = 'USDC allowance';

export const FACT_STEP = 'Step';

export const STEP_TWO = '1 of 2 · approve USDC, then contribute';

export const approveLabel = (usdcText: string): string => `Approve ${usdcText} USDC in wallet`;

export const allowanceOf = (usdcText: string): string => `${usdcText} USDC`;

/** COPY-406 (the remaining changed), COPY-407 (no longer open), COPY-154 (not enough USDC), COPY-408 (refund not due). */
export const CHANGED_COPY = 'COPY-406';

export const CLOSED_COPY = 'COPY-407';

export const LOW_USDC_COPY = 'COPY-154';

export const NOT_ELIGIBLE_COPY = 'COPY-408';

export const doneOn = (action: string): string =>
  `Done. ${action} is on its way; its status updates here.`;

export const contributed = (usdcText: string): string =>
  `Contribution confirmed: ${usdcText} USDC.`;

export const REFUND_SUMMARY =
  'The funding deadline passed before the target was reached. Starting refunds moves the campaign to Refunding, so every contributor can claim their USDC back.';

export const FACT_CAMPAIGN = 'Campaign';

export const REFUNDS_STARTED = 'Refunds started. The campaign is now Refunding.';

export const CLAIM_REFUND = 'Claim refund';

export const FACT_REFUNDABLE = 'Refundable amount';

export const FACT_ELIGIBILITY = 'Eligibility';

export const CONTRIBUTOR = 'Contributor';

export const claimSummary = (usdcText: string): string =>
  `Claim your ${usdcText} USDC refundable balance.`;

export const REFUND_CONFIRMED = 'Refund confirmed.';

// ---- D06 Claim slots (s04-campaign.md §3.7) ----
export const CLAIM_SLOTS = 'Claim slots';

export const CLAIM_LABEL = 'Slots to claim · 1–50';

export const FACT_OPEN_SLOTS = 'Available open slots';

export const FACT_REMAINING = 'Remaining cap';

export const FACT_CLAIM_DEADLINE = 'Claim deadline';

export const OPEN = 'Open';

export const TRACK_JOB = 'Track job';

export const MUST_BE_ACTIVE = 'Campaign must be Active.';

export const ROLE_CHANGED = 'Role unavailable · This screen is for Planter accounts.';

export const UNAVAILABLE =
  'Could not load this page · Your inputs and local records are unchanged.';

export const capExceeded = (remaining: number): string =>
  `You can claim at most ${remaining} more slots in this campaign`;

export const JOB_FAILED_COPY = 'COPY-158';

export const WINDOW_CLOSED_COPY = 'COPY-012';

export const NOT_ENOUGH_COPY = 'COPY-013';

export const CLAIM_REVIEW = {
  region: 'Review Claim slots',
  summary: 'The platform queues a claim job. No USDC deposit or gas approval is required.',
  confirm: 'Confirm',
  cancel: 'Cancel',
  close: 'Close',
  done: 'Done. Claim slots is on its way; its status updates here.',
} as const;
