// Every sentence S15 shows (s15-my-carbon.md §3, §9). Verbatim from the mockup (my-carbon.jsx), SRS §3.6.4, FR-003 and
// FR-012; COPY-353 and COPY-354 stay lorem until the owner approves them.
export const EYEBROW = 'MY CARBON';

export const LINE = 'Your carbon,';

export const HEADING_EM = 'accounted for.';

export const COORD = '04 / YOUR LEDGER';

export const FIGURES = [
  ['Issued', 'ready to retire'],
  ['Reserved', 'not issued yet'],
  ['Retired', 'claimed for good'],
] as const;

export const CATALOG_TITLE = 'Your credits';

export const CATALOG_KICKER = 'Issued, reserved, retired.';

export const TABS = ['Issued balances', 'Reservations', 'Retirements'] as const;

export const TABS_LABEL = 'Carbon sections';

export const LOADING = 'Loading carbon holdings…';

export const FAILED_TITLE = 'Couldn’t load your carbon';

export const WALLET_PENDING = 'Your wallet is still being prepared. Try again in a moment.';

export const TRY_AGAIN = 'Try again';

export const NOUN = {
  'Issued balances': 'batch',
  Reservations: 'reservations',
  Retirements: 'retirements',
} as const;

export const HINT = {
  'Issued balances': 'Only issued credits can be retired',
  Reservations: 'Pre-certification, not issued',
  Retirements: 'Newest first',
} as const;

export const EMPTY = {
  'Issued balances': ['No issued balance', 'Only issued credits can be retired.'],
  Reservations: ['No reservations', 'Your campaign reservations will appear here.'],
  Retirements: ['No retirements yet', 'Retire issued credits to create a retirement record.'],
} as const;

export const EXPLORE = 'Explore credits';

export const UNIT = 'tCO₂e';

export const ISSUED = 'Issued';

export const toRetire = 'tCO₂e to retire';

export const SHARE_HELD = 'Share still held';

export const retiredSoFar = (amount: string): string => `${amount} tCO₂e retired so far`;

const SERIAL_TAIL = -5;

export const serialOf = (start: string, end: string): string =>
  `Serial ${start.slice(SERIAL_TAIL)}–${end.slice(SERIAL_TAIL)}`;

export const RETIRE_CREDITS = 'Retire credits';

export const RESERVED = 'Reserved';

export const DECLINED = 'Declined';

export const RESERVED_TOTAL = 'tCO₂e reserved';

export const PRE_CERTIFICATION = 'pre-certification';

export const ISSUED_TO_YOU = 'tCO₂e issued to you';

export const RESERVATION_ISSUED = 'Reservation issued';

export const unfilledOf = (amount: string): string => `${amount} tCO₂e unfilled`;

export const updatedOf = (date: string): string => `Updated ${date}`;

export const DECLINE = 'Decline unfilled share';

export const RELEASED = 'Unfilled share released';

export const RETIRED = 'Retired';

export const batchTag = (id: string): string => `Batch #${id}`;

export const forBeneficiary = (beneficiary: string): string => `For ${beneficiary}`;

export const NO_PURPOSE = 'No purpose given';

export const RETIRED_UNIT = 'tCO₂e retired';

export const ON_CHAIN = 'On-chain · confirmed';

export const registryOf = (status: 'pending' | 'done'): string =>
  `Registry · ${status === 'done' ? 'Done' : 'Pending'}`;

export const VIEW_RECORD = 'View record';

/** COPY-353 (load more) and COPY-354 (load more failed). */
export const LOAD_MORE_COPY = 'COPY-353';

export const LOAD_MORE_FAILED_COPY = 'COPY-354';

// ---- the dialogs (D09, D10) ----
export const RELEASE_TITLE = 'Release your reservation.';

export const RETIRE_TITLE = 'Make it count.';

export const CLOSE = 'Close';

export const retireSubtitle = (batchId: string, available: string): string =>
  `Batch #${batchId} · ${available} tCO₂e available`;

export const RELEASE_NOTE =
  'Only the unfilled reservation is released. Your allocated credits stay yours.';

export const AMOUNT_LABEL = 'Amount · tCO₂e';

export const BENEFICIARY_LABEL = 'Beneficiary';

export const PURPOSE_LABEL = 'Purpose';

export const REVIEW = 'Review';

export const AMOUNT_RULE = 'Enter a positive amount within your balance, up to 3 decimals.';

export const BENEFICIARY_RULE = 'Enter a beneficiary.';

export const DECLINE_REVIEW = 'This releases the unfilled claim; issued allocations are unchanged.';

export const RETIRE_REVIEW =
  'Retirement permanently reduces the issued balance. Registry retirement remains a separate, pending step.';

export const forLine = (beneficiary: string, purpose: string): string =>
  purpose === '' ? `For ${beneficiary}` : `For ${beneficiary} · ${purpose}`;

export const READY = 'Ready to confirm in your wallet.';

export const PENDING = 'Confirming…';

export const INDEXING = 'Confirmed · Updating balances…';

export const REJECTED = 'Wallet rejected. Nothing changed.';

export const FAILED = 'Transaction failed. Nothing changed.';

export const CONFIRM = 'Confirm in wallet';

export const PROCESSING = 'Processing…';

export const BACK_TO_EDIT = 'Back to edit';

export const RELEASED_TOAST = 'Unfilled reservation released';
