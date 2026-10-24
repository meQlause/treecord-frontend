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
