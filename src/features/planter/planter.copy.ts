// Every sentence the planter lists show (S16 now; S17, S18 and S22 add theirs). Verbatim from the mockup
// (planter-pages.jsx), the SRS or error-handling §4; a COPY id with no approved text is a lorem placeholder.

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
