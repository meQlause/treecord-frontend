// Every sentence S14 shows (s14-create-campaign.md §3, §4, §8). Verbatim from the mockup (create-campaign.jsx), SRS FR-076 to
// FR-079 and error-handling §4; COPY-175, 418 and 419 stay lorem until the owner approves them.
export const EYEBROW = 'FROM THE GROUND UP';

export const HEADING = 'Create a campaign';

export const STEPS = ['Campaign information', 'Funding & schedule', 'Review'] as const;

export const STEPS_LABEL = 'Campaign creation steps';

export const STEP_TITLES = [
  'Give it a place to grow.',
  'Plan for the long run.',
  'A final look.',
] as const;

export const stepEyebrow = (step: number): string => `STEP 0${step + 1}`;

export const CHECK_FIELDS = 'Check the highlighted fields before continuing.';

// ---- the rules (§4) ----
export const wholeNumber = ({ min, max }: { min: number; max: number }): string =>
  `Enter a whole number from ${min} to ${max}.`;

export const lengthRule = ({ min, max }: { min: number; max: number }): string =>
  `Use ${min}–${max} characters.`;

export const DESCRIPTION_RULE = 'Maximum 5,000 characters.';

export const SPECIES_RULE = 'Select an available species.';

export const coordinateRule = (max: number): string => `Enter a coordinate from −${max} to ${max}.`;

export const TOO_MANY_URLS = 'Maximum 10 URLs.';

export const BAD_URL = 'Enter a valid HTTP(S) URL on each line.';

export const TARGET_RULE = 'Enter a positive USDC amount, up to 6 decimals.';

export const ANCHOR_RULE = 'Use 0–100%, up to 2 decimals.';

export const SPLITS_RULE = 'All five shares must total exactly 100% (up to 2 decimals each).';

export const INCENTIVE_RULE =
  'Increase funding or incentives: incentives per tree must be non-zero.';

export const FUNDING_RULE = 'Choose a future funding deadline.';

export const CLAIM_RULE = 'Claim deadline must be on or after funding deadline.';

// ---- step 1 ----
export const F_TITLE = 'Campaign title';

export const TITLE_PLACEHOLDER = 'A new tide for Demak';

export const F_SPECIES = 'Species';

export const F_REGION = 'Region';

export const REGION_PLACEHOLDER = 'Demak, Central Java';

export const F_DESCRIPTION = 'Description';

export const OPTIONAL = 'Optional';

export const AREA = 'Planting area';

export const F_LAT = 'Center latitude';

export const LAT_PLACEHOLDER = '−6.894';

export const F_LON = 'Center longitude';

export const LON_PLACEHOLDER = '110.638';

export const F_RADIUS = 'Radius · meters';

export const URLS_SUMMARY = 'Image URLs · Optional';

export const F_URLS = 'One URL per line';

export const URLS_NOTE = 'Up to 10 existing image URLs.';

// ---- step 2 ----
export const F_TARGET = 'Funding target · USDC';

export const F_TREES = 'Tree target';

export const F_MONTHS = 'Commitment · months';

export const F_CAP = 'Per-planter cap';

export const F_ANCHOR = 'Anchor share · %';

export const F_OPEN = 'Open share';

export const SCHEDULE = 'Schedule';

export const localTimeHint = (zone: string): string => `Your local time · ${zone}`;

export const F_FUNDING = 'Funding deadline';

export const F_CLAIM = 'Claim deadline';

export const BUDGET = 'Budget allocation';

export const BUDGET_ROWS = [
  'Planter incentives',
  'Seedlings',
  'Verification',
  'Replacement reserve',
  'Platform fee',
] as const;

export const percentLabel = (label: string): string => `${label} percent`;

export const totalLine = (total: string): string => `Total: ${total}% / 100%`;

export const USDC = 'USDC';

/** COPY-418 (the creator wallet field, operators only) and COPY-419 (its hint). */
export const CREATOR_LABEL = 'COPY-418';

export const CREATOR_HINT = 'COPY-419';

// ---- step 3 ----
export const REVIEW_INFO = 'Campaign information';

export const REVIEW_FUNDING = 'Funding & schedule';

export const EDIT = 'Edit';

export const MILESTONES = 'Incentive milestones';

export const MILESTONE_ROWS = [
  ['Planting', '10%'],
  ['Month 3', '10%'],
  ['Month 6', '10%'],
  ['Month 12', '15%'],
  ['Month 24', '15%'],
  ['Month 36', '40%'],
] as const;

export const R_TITLE = 'Title';

export const R_AREA = 'Area center';

export const R_RADIUS = 'Radius';

export const R_URLS = 'Image URLs';

export const R_TARGET = 'Funding target';

export const R_COMMITMENT = 'Commitment';

export const R_ANCHOR = 'Anchor / open';

export const monthsOf = (months: string): string => `${months} months`;

// ---- actions and status ----
export const BACK = 'Back';

export const CONTINUE = 'Continue';

export const REVIEW_CAMPAIGN = 'Review campaign';

export const CREATE = 'Create campaign';

export const SAVING = 'Saving campaign details…';

export const WALLET = 'Confirm in your wallet';

export const SUBMITTED = 'Confirming the transaction…';

export const INDEXING = 'Confirmed · Adding it to the catalog…';

export const REJECTED = 'Wallet rejected. Your inputs are preserved.';

export const FAILED = 'Transaction failed. Your inputs are preserved.';

export const UNAVAILABLE =
  'Could not load this page · Your inputs and local records are unchanged.';

export const WALLET_PENDING = 'Your wallet is still being prepared. Try again in a moment.';

export const TRY_AGAIN = 'Try again';

// ---- the preview and the complete state ----
export const PREVIEW = 'CAMPAIGN PREVIEW';

export const NEXT_FOREST = 'Your next forest.';

export const CHOOSE_REGION = 'Choose a region';

export const PREVIEW_NOTE = 'Every tree, proven.';

export const COMPLETE_EYEBROW = 'CAMPAIGN CREATED';

export const COMPLETE_TITLE = 'A new beginning.';

export const COMPLETE_LINE = 'Your campaign is in the catalog and open for funding.';

export const VIEW_CAMPAIGN = 'View campaign';

export const BACK_TO_DONOR = 'Back to donor home';

export const BACK_TO_REVIEW = 'Back to review';

export const CREATED_TOAST = 'Campaign created';
