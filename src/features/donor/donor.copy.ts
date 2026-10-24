// Every sentence S13 (the donor home) shows. Verbatim from the mockup (donor.jsx), the SRS or error-handling §4; a COPY id
// with no approved text is a lorem placeholder (conventions §9).

// ---- heading and action cards ----
export const HOME_EYEBROW = 'DONOR HOME';

export const HOME_LINE_ONE = 'A little care.';

export const HOME_LINE_TWO = 'A lasting canopy.';

export const EXPLORE_KICKER = '01 · Fund a planting';

export const EXPLORE_TITLE = 'Explore';

export const EXPLORE_EM = 'campaigns';

export const CREATE_KICKER = '02 · Start your own';

export const CREATE_TITLE = 'Create';

export const CREATE_EM = 'campaign';

// ---- overview ----
export const OVERVIEW_LABEL = 'Your contribution overview';

export const GIVING_KICKER = '01 · Your giving';

export const GIVING_TITLE = 'Where it';

export const GIVING_EM = 'went';

export const GIVING_CAPTIONS = ['USDC CONTRIBUTED', 'CAMPAIGNS', 'USDC TO PLANTERS'] as const;

export const givingLabel = (contributed: string, campaigns: number, paid: string): string =>
  `${contributed} USDC contributed to ${campaigns} campaigns; ${paid} USDC released to planters`;

export const TREES_KICKER = '02 · Your trees';

export const TREES_TITLE = 'How they’re';

export const TREES_EM = 'growing';

export const TREES_CAPTIONS = ['TREES PLANTED', 'SURVIVAL', 'OPEN FLAGS'] as const;

export const treesLabel = (planted: string, survival: string, flags: number): string =>
  `${planted} trees planted; survival ${survival}; ${flags} open flags`;

// ---- states ----
export const LOADING = 'Loading your home…';

export const FAILED_TITLE = 'Couldn’t load your home';

export const FAILED_BODY = 'Your contributions haven’t changed.';

export const TRY_AGAIN = 'Try again';

export const OFFLINE_SNAPSHOT = 'Offline · Showing the last dashboard snapshot';

export const REFRESH = 'Refresh';

export const REFRESHED = 'Dashboard refreshed';

export const WALLET_WAIT = 'Your wallet is still being prepared. Try again in a moment.';

export const EMPTY_EYEBROW = 'ROOM TO GROW';

export const EMPTY_TITLE = 'Your first forest is waiting.';

export const EMPTY_BODY = 'No funded campaigns yet.';

export const EXPLORE_CAMPAIGNS = 'Explore campaigns';

// ---- my campaigns ----
export const MY_CAMPAIGNS = 'My campaigns';

export const supported = (count: number): string => `${count} supported`;

export const TABS_LABEL = 'Supported campaign status';

export const TABS = ['All', 'Funding', 'Active', 'Refunding', 'Completed'] as const;

export const noCampaigns = (tab: string): string => `No ${tab.toLowerCase()} campaigns`;

export const SHOW_ALL = 'Show all campaigns';

/** COPY-172, COPY-174: lorem until the owner approves the load-more row (the busy label is the shared "Loading…"). */
export const LOAD_MORE_COPY = 'COPY-172';

export const LOAD_MORE_FAILED_COPY = 'COPY-174';

// ---- the card ----
export const VIEW_CAMPAIGN = 'View campaign';

export const viewCampaignLabel = (title: string): string => `${VIEW_CAMPAIGN}: ${title}`;

export const YOUR_CONTRIBUTION = 'Your contribution';

export const USDC = 'USDC';

export const shareLine = (share: string): string => `${share}% of funding raised`;

export const NO_VALUE = '—';

export const CAMPAIGN_FUNDING = 'Campaign funding';

export const RAISED = 'USDC raised';

export const ofTarget = (target: string): string => `of ${target}`;

export const plantedOfTotal = (total: string): string => ` / ${total} trees planted`;

export const planned = (total: string): string => `${total} trees planned`;

export const NOT_PLANTED = 'Not planted yet';

export const TREE_HEALTH = 'Tree health';

export const healthScale = (each: string): string => `Across this campaign · one tree ≈ ${each}`;

export const FUNDS = 'Funds';

export const CARBON = 'Carbon';

export const BUDGET_OF = 'of the planter budget';

export const RELEASED = 'Released to planters';

export const REFUNDED = 'Refunded to you';

export const NOT_ESTIMATED = 'Not estimated yet';

export const NO_CARBON = 'No reservations or issued credits.';

export const CARBON_LABELS = [
  'Campaign estimate',
  'Your reservation',
  'Issued allocation',
  'Issued holdings',
] as const;

export const CARBON_NOTE = 'Estimate and unfilled reservation are pre-certification.';

export const IMPACT_REPORT = 'Impact report';

// ---- the rail ----
export const RAIL_LABEL = 'Carbon and flags';

export const YOUR_CARBON = 'Your carbon';

export const ISSUED_BALANCE = 'Issued balance';

export const TOTAL_ALLOCATED = 'Total allocated';

export const UNFILLED = 'Unfilled reservation';

export const PRE_CERTIFICATION = 'Pre-certification';

export const NOT_ISSUED = 'Reserved credits have not been issued.';

export const UNIT = 'tCO₂e';

export const FLAGS = 'Flags';

export const openCount = (count: number): string => `${count} open`;

export const pendingCount = (count: number): string => `${count} pending`;

export const treeNumber = (treeId: string): string => `Tree #${treeId}`;

export const FLAG_BADGE = { open: 'Open', pending: 'Pending' } as const;

export const PAUSE_LINE = {
  open: 'On-chain · Payouts and milestone clock paused.',
  pending: 'Not on-chain · Payouts are not paused.',
} as const;

export const VIEW_TREE = 'View tree';

export const NO_FLAGS = 'No open or pending flags';

export const FLAGS_FOOT =
  'Pending flags don’t pause payouts. Once a flag is on-chain, that tree’s payouts and milestone clock pause.';
