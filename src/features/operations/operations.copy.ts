// Every sentence of S27, S28, S29 and D14 (s27 §3, s28 §3, s29 §3, s29 §D14). Verbatim from the mockup (operator-pages.jsx), the
// SRS or error-handling §4/§5.1; the registry's COPY ids stay lorem until the owner approves them.
export const TRY_AGAIN = 'Try again';

export const UNAVAILABLE =
  'Could not load this page · Your inputs and local records are unchanged.';

export const MUST_BE_ACTIVE = 'Campaign must be Active.';

export const TRACK_JOB = 'Track job';

export const QUEUED_NOT_CONFIRMED = 'Queued is not confirmed.';

export const LAST_ERROR = 'Last error';

export const NONE = 'None';

export const DASH = '—';

export const CONFIRM = 'Confirm';

export const CANCEL = 'Cancel';

export const CLOSE = 'Close';

export const DEFAULT_SUMMARY = 'Review this action before confirming.';

export const reviewOf = (label: string): string => `Review ${label}`;

export const doneOf = (label: string): string =>
  `Done. ${label} is on its way; its status updates here.`;

// ---- S27 ----
export const OPS_EYEBROW = 'CAMPAIGN OPERATIONS';

export const OPS_TABS = [
  'Anchor assignment',
  'Carbon estimate',
  'Mirror issuance',
  'Inventory price',
] as const;

export const LINK_CAMPAIGN = 'Campaign';

export const LINK_REPORT = 'Impact report';

export const CAMPAIGN_NOT_FOUND = 'Campaign not found';

export const KNOWN_SUBMISSION = 'Known submission';

export const SUBMISSION_ID = 'Submission ID';

export const OPEN_REVIEW = 'Open review';

export const OPEN_BY_ID = 'Open a submission by its ID.';

export const F_AVAILABLE = 'Available anchor slots';

export const F_ROLLED = 'Rolled-over open slots';

export const F_WALLET = 'Planter wallet';

export const F_COUNT = 'Slot count';

export const ASSIGN = 'Assign anchor slots';

export const assignSummary = (count: string, wallet: string): string =>
  `Assign ${count} slots to ${wallet}. Confirmation queues a job.`;

export const F_METHOD = 'Method';

export const F_SPECIES = 'Species';

export const F_TREES = 'Tree count';

export const F_COMMITMENT = 'Commitment';

export const F_RATE = 'Mature rate / years to maturity';

export const F_PER_TREE = 'kg per tree / average maturity';

export const F_CURRENT = 'Current estimate';

export const NOT_COMPUTED = 'Not computed';

export const ESTIMATE_TEXT =
  'Pre-certification total for the campaign. Computing also queues the estimate transaction.';

export const COMPUTE = 'Compute & set estimate';

export const ESTIMATE_LOCKED = 'Estimate locked after first issuance.';

export const monthsOf = (months: number): string => `${months} months`;

export const rateOf = (rate: string, years: number): string => `${rate} kg/yr / ${years} years`;

export const perTreeOf = (kilos: string, percent: string): string => `${kilos} kg / ${percent}%`;

export const estimateOf = (tonnes: string, label: string): string => `${tonnes} tCO₂e ${label}`;

export const ISSUANCE_TEXT = 'Record registry issuance that already happened outside Treecord.';

export const F_REGISTRY = 'Registry';

export const F_VINTAGE = 'Vintage';

export const F_SERIAL_START = 'Serial start';

export const F_SERIAL_END = 'Serial end';

export const F_TONNES = 'Tonnes (tCO₂e)';

export const MIRROR = 'Mirror issuance';

export const mirrorSummary = (tonnes: string, registry: string, vintage: string): string =>
  `${tonnes} tCO₂e · ${registry} · ${vintage}. Allocations are unavailable until confirmation and indexing.`;

export const F_BATCH = 'Batch';

export const F_PRICE_NOW = 'Current price';

export const F_INVENTORY = 'Inventory';

export const F_PRICE_ASK = 'Requested USDC per tonne';

export const PRICE_HINT = 'Up to 6 decimals. Zero pauses sales.';

export const SET_PRICE = 'Set inventory price';

export const NOT_SET = 'Not set';

export const NO_BATCHES = 'No issued batches';

export const BATCH_NOT_FOUND = 'Batch not found';

export const LOADING_BATCHES = 'Loading issued batches…';

export const batchOption = (id: string, registry: string, vintage: number): string =>
  `#${id} · ${registry} · ${vintage}`;

export const priceOf = (price: string): string => `${price} USDC / t`;

export const priceSummary = (price: string): string =>
  `Requested price ${price} USDC / t. Current price remains until confirmation.`;

export const inventoryOf = (tonnes: string): string => `${tonnes} tCO₂e`;

/** COPY-413…417, 422: the rule of each field, stated up front (ui-gaps pattern 6a). */
export const RULE_COPY = {
  wallet: 'COPY-413',
  count: 'COPY-414',
  registry: 'COPY-415',
  vintage: 'COPY-416',
  serial: 'COPY-417',
  tonnes: 'COPY-422',
} as const;

export const SPECIES_UNKNOWN_COPY = 'COPY-017';

// ---- S28 ----
export const REVIEW_HEADING = 'Submission review';

export const SUBMISSION_NOT_FOUND = 'Submission not found';

export const F_TREE = 'Tree';

export const F_KIND = 'Kind';

export const F_POLICY = 'Policy decision';

export const F_SCORE = 'Policy score';

export const F_LIVENESS = 'Liveness · higher is better';

export const F_PRESENCE = 'Tree presence · higher is better';

export const F_RECAPTURE = 'Recapture / duplicate · lower is better';

export const F_GROWTH = 'Growth';

export const F_TAG = 'Tree tag';

export const F_MODEL = 'Model';

export const NOT_SCORED = 'Not scored';

export const FULL_SUBMISSION = 'Full submission';

export const F_DECISION = 'Decision';

export const APPROVE_OPTION = 'Approve · sign the attestation';

export const REJECT_OPTION = 'Reject';

export const F_NOTE = 'Review note · required';

export const APPROVE_REVIEW = 'Approve review';

export const REJECT_REVIEW = 'Reject review';

export const APPROVE_SUMMARY =
  'The platform signs the attestation; it lands on-chain and the milestone pays.';

export const REJECT_SUMMARY =
  'The submission is rejected with your note; the planter can record again while the window is open.';

export const NOT_WAITING = 'Not waiting for review.';

export const OUTCOME: Readonly<Record<string, string>> = {
  attested: 'Approved · the attestation is on its way on-chain.',
  onchain: 'On-chain · the milestone counted.',
  rejected: 'Rejected.',
};

export const OPERATOR_REJECTED_COPY = 'COPY-251';

export const CANNOT_ATTEST_COPY = 'COPY-014';

export const tagLine = (tag: string, state: string): string => `${tag} · ${state}`;

export const TAG_READ = 'read in the video';

export const TAG_NOT_READ = 'not read';

export const TAG_NOT_SCORED = 'not scored yet';

export const kindOf = (kind: string, month: number | null): string =>
  month === null ? kind : `${kind} · month ${month}`;

export const slotOf = (slot: string): string => `Slot ${slot}`;

// ---- S29 ----
export const RESOLVE_HEADING = 'Resolve tree flag';

const FLAG_ID_CHARS = 8;

export const FLAG_NOT_FOUND = 'Flag not found for this tree';

export const flagTitle = (treeId: string, flagId: string): string =>
  `Tree #${treeId} · Flag #${flagId.slice(0, FLAG_ID_CHARS)}`;

export const F_CAMPAIGN = 'Campaign';

export const F_REASON = 'Reason';

export const F_OPENED = 'Opened';

export const F_HASH = 'Reason hash / contributor';

export const F_PREVIOUS = 'Previous status';

export const F_CLOCK = 'Payouts / clock';

export const PAUSED = 'Paused';

export const SEE_TREE = 'See current tree state';

export const TREE_HISTORY = 'Tree history';

export const DISMISS_OPTION = 'Dismiss · restore previous status';

export const UPHOLD_OPTION = 'Uphold · remove tree';

export const F_RESOLUTION = 'Resolution note · 3–2,000 characters';

export const RESOLVE = 'Resolve flag';

export const UPHOLD_SUMMARY =
  'Tree becomes Removed after confirmation; unpaid incentives return to the campaign pool.';

export const DISMISS_SUMMARY =
  'Restore the prior status after confirmation; chain adjusts the paused schedule.';

export const PENDING_LINE = 'Resolution pending. Review the job before another decision.';

export const resolvedLine = (note: string): string => `Resolved · ${note}`;

export const NOT_ON_CHAIN_COPY = 'COPY-250';

export const FLAG_NOT_OPEN_COPY = 'COPY-016';
