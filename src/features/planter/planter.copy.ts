// Every sentence the planter lists show (S16 now; S17, S18 and S22 add theirs). Verbatim from the mockup
// (planter-pages.jsx), the SRS or error-handling §4; a COPY id with no approved text is a lorem placeholder.

import { UPLOAD_WINDOW_HOURS } from '../evidence/evidence.config';

// ---- shared by the planter lists ----
export const WALLET_WAIT = 'Your wallet is still being prepared. Try again in a moment.';

export const TRY_AGAIN = 'Try again';

export const CLEAR_FILTERS = 'Clear filters';

/** COPY-200 and COPY-201: lorem until the owner approves the load-more row (one pair for S16, S18 and S20). */
export const LOAD_MORE_COPY = 'COPY-200';

export const LOAD_MORE_FAILED_COPY = 'COPY-201';

// ---- S16 heading and overview ----
export const TREES_EYEBROW = 'PLANTER WORKSPACE';

export const TREES_LINE = 'Care that keeps';

export const TREES_EM = 'growing.';

export const TREES_COORD = '05 / YOUR TREES';

export const OVERVIEW_LABEL = 'Your trees overview';

export const TREES_KICKER = '01 · Your trees';

export const TREES_TITLE = 'Rooted';

export const TREES_TITLE_EM = 'and counted';

export const TREES_CAPTIONS = ['TREES IN YOUR CARE', 'SURVIVAL', 'FLAGGED'] as const;

export const INCENTIVES_KICKER = '02 · Your incentives';

export const INCENTIVES_TITLE = 'Paid as';

export const INCENTIVES_EM = 'they grow';

export const INCENTIVES_CAPTIONS = ['USDC SET ASIDE', 'TREES', 'USDC PAID TO YOU'] as const;

export const incentivesLabel = (setAside: string, trees: number, paid: string): string =>
  `${setAside} USDC set aside for ${trees} trees; ${paid} USDC paid to you`;

// ---- S16 catalog ----
export const TREES_CATALOG = 'My trees';

export const TREES_KICKER_LINE = 'Every check-in, on time.';

export const TREE_FILTERS = ['All', 'Alive', 'Flagged', 'Dead', 'Removed', 'Completed'] as const;

export const TREE_FILTERS_LABEL = 'Tree status';

export const treeCount = (shown: number, all: number): string =>
  shown < all ? `${shown} trees of ${all}` : `${shown} trees`;

export const openNote = (open: number): string => {
  if (open === 0) {
    return 'No check-in open';
  }

  return `${open} check-in${open > 1 ? 's' : ''} open now`;
};

export const NO_MATCHING_TREES = 'No matching trees';

export const VIEW_SLOTS = 'View slots';

// ---- the tree card ----
export const treeNumber = (treeId: string): string => `Tree #${treeId}`;

export const MILESTONES_PAID = 'Milestones paid';

export const STATUS_LABEL = {
  alive: 'Alive',
  flagged: 'Flagged',
  dead: 'Dead',
  removed: 'Removed',
  completed: 'Completed',
} as const;

/** The mockup's `BADGE`: which badge colour each tree state wears. */
export const STATUS_BADGE = {
  alive: 'funding',
  flagged: 'refunding',
  dead: 'refunding',
  removed: 'completed',
  completed: 'active',
} as const;

export const pausedAt = (month: number): string => `Paused at month ${month}`;

export const PAUSED_UNTIL = 'until the flag is resolved';

export const monthLabel = (month: number): string => `Month ${month}`;

export const nextPayout = (usdc: string): string => `${usdc} USDC next`;

export const ALL_SETTLED = 'All settled';

export const ALL_PAID = 'every milestone paid';

export const NO_MORE_PAYOUTS = 'no further payouts';

export const submittedHere = (status: string): string => `Submitted from this phone · ${status}`;

export const submitted = (status: string): string => `Submitted · ${status}`;

export const PAUSED_META = 'Payouts and clock paused';

export const replantBy = (date: string): string => `Replant by ${date}`;

export const windowOpenUntil = (date: string): string => `Window open until ${date}`;

export const nextWindow = (date: string): string => `Next window ${date}`;

export const SETTLED = 'Settled';

export const NO_DATE = '—';

export const RECORD_CHECK_IN = 'Record check-in';

export const RECORD_REPLANT = 'Record replant';

export const VIEW_TREE = 'View tree';

export const REPORT_DEAD = 'Report dead';

export const checkInHeld = (month: number, state: string): string =>
  `Month ${month} check-in ${state}`;

// ---- S17 slots ----
export const SLOTS_EYEBROW = 'YOUR NEXT START';

export const SLOTS_LINE = 'Room for';

export const SLOTS_EM = 'new roots.';

export const SLOTS_COORD = '06 / UNPLANTED SLOTS';

export const SLOTS_CATALOG = 'Unplanted slots';

export const SLOTS_KICKER = 'Claimed, waiting for a seedling.';

export const SLOT_FILTERS = ['All', 'Claimed', 'Assigned'] as const;

export const SLOT_FILTERS_LABEL = 'Slot status';

export const slotCount = (shown: number, all: number): string =>
  shown < all ? `${shown} slots of ${all}` : `${shown} slots`;

export const CLAIM_MORE = 'Claim more in a campaign';

export const NO_SLOTS = 'No unplanted slots';

export const BROWSE_CAMPAIGNS = 'Browse campaigns';

/** COPY-403: lorem until the owner approves the title of a filter that matches no slot. */
export const NO_MATCHING_SLOTS_COPY = 'COPY-403';

export const slotNumber = (slotId: string): string => `Slot #${slotId}`;

export const SLOT_BADGE = { claimed: 'Claimed', anchor: 'Assigned' } as const;

export const SLOT_BADGE_CLASS = { claimed: 'funding', anchor: 'active' } as const;

export const slotKind = (kind: 'open' | 'anchor'): string =>
  `${kind === 'open' ? 'Open' : 'Anchor'} slot`;

export const TO_PLANT = 'to plant';

export const radiusLabel = (metres: string): string => `${metres} m`;

export const tagLine = (code: string | null): string => `Tag ${code ?? 'not issued'}`;

export const PRINT_TAG = 'Print tag';

export const printLine = (slotId: string, title: string): string => `Slot #${slotId} · ${title}`;

export const RECORD_PLANTING = 'Record planting';

// ---- S18 challenges ----
export const CHALLENGES_EYEBROW = 'AUDIT CHALLENGES';

export const CHALLENGES_LINE = 'Show the code,';

export const CHALLENGES_EM = 'prove the tree.';

export const CHALLENGES_COORD = '07 / CHALLENGES';

export const CHALLENGES_CATALOG = 'Open challenges';

export const CHALLENGES_KICKER = 'A code in the scene, a tree beyond doubt.';

export const openCount = (count: number): string => `${count} open`;

export const answerableNote = (count: number): string =>
  count > 0 ? `${count} can be answered now` : 'None can be answered right now';

export const NO_CHALLENGES = 'No open challenges';

export const NO_CHALLENGES_BODY = 'New challenges appear here when an auditor issues one.';

export const BADGE_ANSWER = 'Answer now';

export const BADGE_SENT = 'Check-in already sent';

export const BADGE_WAITING = 'Waiting for a window';

export const pausedBadge = (status: string): string => `Paused · ${status}`;

export const issuedOn = (date: string): string => `Issued ${date}`;

export const PRINT_QR = 'Print QR';

export const challengePrintLine = (treeId: string, expires: string): string =>
  `Challenge · Tree #${treeId} · expires ${expires}`;

export const HOWTO = [
  'Print the QR, or write the code',
  'Hold it beside the tree tag',
  'Record 5–10 seconds',
] as const;

export const NO_TAG = '—';

export const daysLeftLine = (left: number, expires: string): string =>
  `${left} day${left === 1 ? '' : 's'} left · expires ${expires}`;

export const RECORD_RESPONSE = 'Record response';

export const heldLink = (month: number, status: string): string =>
  `Month ${month} check-in ${status} · the code rides on the next one`;

/** error-handling §4.2 sentences for the capture reasons a challenge can wait on. */
export const REASON_TEXT: Readonly<Record<string, string>> = {
  device_unknown_or_revoked: 'Device unavailable',
  device_not_owned: 'Signed by another device',
  signature_invalid: 'Device signature doesn’t match',
  hash_mismatch: 'Video changed after signing',
  duplicate_video: 'Video already used',
  stale_capture: `Uploaded more than ${UPLOAD_WINDOW_HOURS} hours after recording`,
  future_capture: 'Capture time is in the future',
  gps_inaccurate: 'GPS accuracy too low',
  outside_region: 'Outside the campaign region',
  moved_tree: 'Too far from where the tree was planted',
  video_too_short: 'Video too short',
  video_too_long: 'Video too long',
  slot_not_owned: 'You don’t hold this slot',
  tree_not_owned: 'Tree unavailable for this account',
  campaign_not_active: 'Campaign must be Active.',
  wrong_tree_status: 'Tree status changed',
  replant_deadline_passed: 'The replant deadline has passed',
  milestone_not_open: 'The check-in window isn’t open',
  milestone_already_done: 'This milestone already has a check-in',
  slot_already_planted: 'This slot already has a planting',
  already_reported: 'Already submitted for this tree',
  challenge_missing: 'The active challenge code is missing',
  tag_missing: 'No tree tag has been issued for this target',
  tag_mismatch: 'The recording names another tree tag',
};
