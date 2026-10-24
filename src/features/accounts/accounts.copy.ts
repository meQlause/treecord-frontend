// Every sentence the accounts feature shows (S02 now; S11 and S12 add theirs). Copy is verbatim from the mockup or the
// SRS; a `{ copyId }` is a lorem placeholder until the owner approves the sentence (conventions §9).
import { ERROR_BODY, ERROR_TITLE } from '../../app/states/states.copy';

export type Message = string | { copyId: string };

// ---- S02 art ----
export const ART_EYEBROW = 'EVERY TREE, PROVEN';

export const ART_TITLE = 'Every tree.';

export const ART_TITLE_EM = 'A shared beginning.';

export const ART_BODY =
  'Fund a planting, care for a tree, or verify one. One account, one wallet, one record.';

// ---- S02 steps and forms ----
export const STEPS_LABEL = 'Sign-in progress';

export const STEP_LABELS = ['Email', 'Code', 'Ready'] as const;

export const SIGN_IN_TITLE = 'Sign in';

/** SI-1 lead; `where` is `whereLabel(returnTo)`. */
export const signInLead = (where: string): string =>
  `We’ll send a six-digit code to your email. Afterwards you’ll return to ${where}.`;

export const EMAIL_LABEL = 'Email';

export const EMAIL_PLACEHOLDER = 'you@example.com';

export const SEND_CODE = 'Send code';

export const CODE_TITLE = 'Check your email';

export const CODE_LEAD = 'Enter the six-digit code sent to';

export const CODE_LABEL = 'Verification code';

export const VERIFY = 'Verify';

export const DIFFERENT_EMAIL = 'Use a different email';

// ---- S02 Ready (SI-16) ----
export const READY_TITLE = 'You’re in.';

export const SIGNED_IN_AS = 'Signed in as';

export const READY_NOTE =
  'Nothing is sent automatically; review any action again before confirming it.';

export const continueTo = (where: string): string => `Continue to ${where}`;

// ---- {where}: the validated returnTo, in words (FR-004) ----
export const WHERE = {
  workspace: 'your workspace',
  profile: 'your profile',
  campaign: 'the campaign you were viewing',
  carbon: 'carbon credits',
  other: 'where you left off',
} as const;

// ---- the alert under the field (SI-4 … SI-14) ----
export const SIGN_IN_ERRORS = {
  CODE_INCORRECT: 'That code is incorrect. Check the six digits and try again.',
  CODE_EXPIRED: 'That code has expired. Use a different email or start again for a new one.',
  PROVIDER_UNAVAILABLE: 'The sign-in provider is unavailable. Try again in a moment.',
  // COPY-102: the provider refused to send a code for a reason other than being unreachable
  SEND_REFUSED: { copyId: 'COPY-102' },
  // COPY-008: error-handling §4.1 wallet_already_linked
  WALLET_LINKED: { copyId: 'COPY-008' },
  WALLET_PENDING: 'Your wallet is still being prepared. Try again in a moment.',
  PROFILE_FAILED: `${ERROR_TITLE}. ${ERROR_BODY}`,
} as const satisfies Record<string, Message>;

export type SignInErrorKey = keyof typeof SIGN_IN_ERRORS;

/** COPY-400: the banner above S02 when a private request answered 401 (ui-gaps pattern 12). */
export const SESSION_ENDED_COPY_ID = 'COPY-400';

// ---- S12 "What it means" context links (FR-028) ----
export const JOB_LINK_SLOTS = 'View slots';

export const JOB_LINK_TREE = 'View tree';

export const JOB_LINK_OPERATIONS = 'Back to operations';

// ---- S11 profile and D01 (s11-profile.md §3) ----
export const ACCOUNT_EYEBROW = (role: string): string => `${role.toUpperCase()} ACCOUNT`;

export const HELLO = 'Hello,';

export const PROFILE_COORD = '05 / YOUR ACCOUNT';

export const PANEL_PERSONAL = 'Personal details';

export const PANEL_WALLET = 'Wallet';

export const NAME_LABEL = 'Display name';

/** COPY-411: the rule stated up front as the label suffix; lorem until the owner approves it. */
export const NAME_RULE = { copyId: 'COPY-411' } as const;

export const FACT_ROLE = 'Role';

export const FACT_EMAIL = 'Email';

export const BUYER_LABEL = 'Credit buyer preference';

export const SAVE_PROFILE = 'Save profile';

export const NOTE_DONOR = 'Your display name appears on the records and certificates you create.';

export const NOTE_PLANTER =
  'Planters receive incentives and assign carbon rights to the platform; they do not receive the campaign’s carbon credits.';

export const PROFILE_SAVED = 'Profile saved';

// ---- the role switch (D01) ----
export const BECOME_PLANTER = 'Become a planter';

export const SWITCH_TO_DONOR = 'Switch to donor';

export const SWITCH_CONFIRM = 'Confirm';

export const SWITCH_CANCEL = 'Cancel';

export const SUMMARY_TO_PLANTER_AGAIN =
  'You accepted the planter agreement earlier. Your workspace changes to My trees.';

export const SUMMARY_TO_PLANTER_FIRST =
  'Planters are paid to keep trees alive and assign the carbon rights of those trees to the platform; they do not receive the campaign’s carbon credits.';

export const SUMMARY_TO_DONOR =
  'Your planter agreement and on-chain history stay. Your workspace changes to Donor home.';

export const AGREEMENT_LABEL =
  'I accept the planter agreement (version 1) and assign carbon rights to the platform. This cannot be withdrawn.';

export const reviewRegion = (action: string): string => `Review ${action}`;

export const NOW_PLANTER = 'You are now a planter';

export const NOW_DONOR = 'You are now a donor';

// ---- the wallet panel ----
export const FACT_ADDRESS = 'Address';

export const WALLET_NOT_READY = 'Wallet not ready';

export const FACT_NETWORK = 'Network';

export const NETWORK = 'Base Sepolia';

export const FACT_SETTLES = 'Settles in';

export const SETTLES_IN = 'USDC · campaign escrow';

export const FACT_AGREEMENT = 'Planter agreement';

export const ACCEPTED = 'Accepted';

export const NOT_ACCEPTED = 'Not accepted';

export const COPY_WALLET = 'Copy wallet';

export const WALLET_COPIED = 'Wallet address copied';

export const COPY_BLOCKED = 'Copy unavailable. Select the address above.';

export const SIGN_OUT = 'Sign out';

export const THIS_DEVICE = 'This device';

export const walletLabel = (wallet: string): string => `Wallet ${wallet} on Base Sepolia`;

export const idCardLabel = (name: string, role: string, email: string): string =>
  `${name}, ${role} account, ${email}`;

// ---- what a refused save says (s11 §5) ----
export const SAVE_ERRORS = {
  /** COPY-103: the server refused the display name. */
  NAME: { copyId: 'COPY-103' },
  /** COPY-001: any other `validation_error`. */
  VALIDATION: { copyId: 'COPY-001' },
  /** COPY-002: `invalid_json`. */
  INVALID_JSON: { copyId: 'COPY-002' },
  /** COPY-004: `agreement_required`. */
  AGREEMENT: { copyId: 'COPY-004' },
  /** COPY-006: `role_locked`. */
  LOCKED: { copyId: 'COPY-006' },
  RETRY: `${ERROR_TITLE}. ${ERROR_BODY}`,
} as const satisfies Record<string, Message>;

export type SaveErrorKey = keyof typeof SAVE_ERRORS;

// ---- S12 job (s12-job.md §3) ----
export const JOB_EYEBROW = (kind: string): string => `TRANSACTION · ${kind.toUpperCase()}`;

export const JOB_TITLE = 'Sent to';

export const JOB_EM_OK = 'the chain.';

export const JOB_EM_FAILED = 'try again.';

const JOB_COORD_LENGTH = 4;

export const jobCoord = (id: string): string =>
  `JOB / ${id.slice(0, JOB_COORD_LENGTH).toUpperCase()}…`;

export const JOB_NOT_FOUND = 'Job not found';

export const LIFECYCLE = 'Lifecycle';

export const LIFECYCLE_LABEL = 'Job lifecycle';

export const JOB_STEPS = [
  ['pending', 'Pending', 'queued by you'],
  ['processing', 'Processing', 'worker picked it up'],
  ['sent', 'Sent', 'broadcast to Base Sepolia'],
  ['confirmed', 'Confirmed', 'receipt final'],
] as const;

export const JOB_RECORD = 'Job record';

export const JOB_FACTS = {
  kind: 'Kind',
  id: 'Job id',
  attempts: 'Attempts',
  when: 'Created / updated',
  hash: 'Transaction hash',
  lastError: 'Last error',
} as const;

export const HASH_PENDING = 'Pending';

export const NONE = 'None';

export const JOB_STOCK = 'Job';

export const JOB_SHARE_LABEL = 'Lifecycle';

export const JOB_NOTE = 'A job moves on its own; this page follows it.';

export const stepNote = (step: number, total: number): string => `Step ${step} of ${total}`;

export const JOB_FAILED_NOTE = 'Failed · retry below';

export const MEANING = 'What it means';

export const MEANING_NOTE = 'Jobs retry safely; nothing runs twice.';

export const MEANINGS = {
  waiting: 'Awaiting processing; no confirmed result yet.',
  sent: 'Broadcast. The receipt is not final yet.',
  confirmed: 'Confirmed. The result is in your workspace now.',
  scored: 'Scoring finished; this does not mean evidence passed.',
  failed: 'The job failed. Check the originating action, then retry.',
} as const;

export const KIND_LABELS: Readonly<Record<string, string>> = {
  claim: 'Claim slots',
  resolve_flag: 'Resolve flag',
  set_price: 'Set price',
  estimate: 'Set estimate',
  score: 'Score evidence',
};
