// Pure display rules of the accounts screens (SR-7). `safeReturn` lives in `app/return-to.ts`, shared with the guards.
import { ApiError } from '../../shared/api/errors';
import type { Role } from '../../app/route-handle';
import type { Profile } from '../../app/session/session';
import {
  JOB_LINK_OPERATIONS,
  JOB_STEPS,
  KIND_LABELS,
  MEANINGS,
  JOB_FAILED_NOTE,
  stepNote,
  JOB_LINK_SLOTS,
  JOB_LINK_TREE,
  WHERE,
  type SignInErrorKey,
} from './accounts.copy';

/** `{where}` of S02 (FR-004), from the already validated `returnTo`. */
export const whereLabel = (target: string): string => {
  if (target === '/app') {
    return WHERE.workspace;
  }

  if (target === '/app/profile') {
    return WHERE.profile;
  }

  if (target.startsWith('/campaigns/')) {
    return WHERE.campaign;
  }

  return target.startsWith('/carbon') ? WHERE.carbon : WHERE.other;
};

// ---- what the sign-in provider (Privy) said ----
type ProviderOutcome = 'invalid' | 'expired' | 'unavailable' | 'refused';

/** s02-sign-in.md §5: the outcome → the alert it shows. */
export const SIGN_IN_PROVIDER: Record<ProviderOutcome, SignInErrorKey> = {
  invalid: 'CODE_INCORRECT',
  expired: 'CODE_EXPIRED',
  unavailable: 'PROVIDER_UNAVAILABLE',
  refused: 'SEND_REFUSED',
};

const UNREACHABLE =
  /network|fetch|load failed|time(?:d )?out|offline|unreachable|abort|unavailable/;
const SERVER_ERROR = 500;
// Privy answers a verify with 429 `too_many_requests` when one account signs in too often: the code was not wrong
const TOO_MANY_REQUESTS = 429;

// Privy errors carry `privyErrorCode` (PrivyClientError) or `code` and `status` (PrivyApiError), plus a message.
const detail = (error: unknown): { words: string; status: number } => {
  const raised = (typeof error === 'object' && error !== null ? error : {}) as Record<
    string,
    unknown
  >;
  const words = [raised.name, raised.code, raised.privyErrorCode, raised.message]
    .filter((part): part is string => typeof part === 'string')
    .join(' ')
    .toLowerCase();

  return { words, status: typeof raised.status === 'number' ? raised.status : 0 };
};

/**
 * Maps an error thrown by `sendCode` / `loginWithCode` to what S02 says (FR-003). Privy answers "Invalid or expired
 * verification code" for both a wrong and an old code, so only an error that says "expired" alone is `expired`.
 * Pinned against the live service (24 Oct 2026): a wrong code is 422 `invalid_credentials` "Invalid email and code
 * combination"; too many sign-ins is 429 `too_many_requests`; an unreachable host throws "Failed to fetch".
 * ponytail: matches the SDK's wording; if a Privy upgrade changes it, an unknown error falls to `invalid` / `refused`.
 */
export const signInOutcome = (error: unknown, step: 'send' | 'verify'): ProviderOutcome => {
  const { words, status } = detail(error);

  if (error instanceof TypeError || status >= SERVER_ERROR || UNREACHABLE.test(words)) {
    return 'unavailable';
  }

  if (step === 'send') {
    return 'refused';
  }

  if (status === TOO_MANY_REQUESTS) {
    return 'unavailable';
  }

  return /expired/.test(words) && !/invalid/.test(words) ? 'expired' : 'invalid';
};

// ---- what `GET /me` said, as S02 sees it ----
export type ProfileOutcome =
  'loading' | 'ready' | 'wallet-pending' | 'linked' | 'rejected' | 'retry';

/** SI-9 … SI-16: `walletAddress: null` is a 200, not an error. */
export const profileOutcome = (result: {
  status: 'pending' | 'error' | 'success';
  data: Profile | undefined;
  error: unknown;
}): ProfileOutcome => {
  const code = result.error instanceof ApiError ? result.error.code : undefined;

  if (code === 'wallet_already_linked') {
    return 'linked';
  }

  if (code === 'missing_token' || code === 'invalid_token') {
    return 'rejected';
  }

  if (result.data !== undefined) {
    return result.data.walletAddress === null ? 'wallet-pending' : 'ready';
  }

  return result.status === 'pending' ? 'loading' : 'retry';
};

/** The alert a `GET /me` outcome puts on the Code step; `null` when there is none. */
export const OUTCOME_ERROR: Record<ProfileOutcome, SignInErrorKey | null> = {
  loading: null,
  ready: null,
  rejected: null,
  linked: 'WALLET_LINKED',
  'wallet-pending': 'WALLET_PENDING',
  retry: 'PROFILE_FAILED',
};

// ---- S12 context links (FR-028, ui-gaps decision b): only to the role that can open them ----
type JobLinkItem = { label: string; to: string };

type JobContext = { campaign: string | null; treeId: string | null };

export const jobLinks = (kind: string, context: JobContext, role: Role): JobLinkItem[] => {
  const links: [boolean, JobLinkItem][] = [
    [kind === 'claim' && role === 'planter', { label: JOB_LINK_SLOTS, to: '/app/planter/slots' }],
    [
      kind === 'resolve_flag' && context.treeId !== null,
      { label: JOB_LINK_TREE, to: `/trees/${context.treeId}` },
    ],
    [
      context.campaign !== null && role === 'operator',
      { label: JOB_LINK_OPERATIONS, to: `/app/operator/campaigns/${context.campaign}` },
    ],
  ];

  return links.filter(([shown]) => shown).map(([, link]) => link);
};

// ---- S12 job (s12-job.md §3, §4, §6) ----
export type JobStatus = 'pending' | 'processing' | 'sent' | 'confirmed' | 'failed';

const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

/** A job id is a uuid; anything else is "Job not found" without a request (JB-11). */
export const isJobId = (id: string): boolean => UUID.test(id);

/** "Claim slots"; a kind with no label shows its identifier (`anchor_assign`, FR-025). */
export const kindLabel = (kind: string): string => KIND_LABELS[kind] ?? kind;

/** `confirmed` and `failed` are the two ends: nothing moves after them (FR-027). */
export const isSettled = (status: JobStatus): boolean =>
  status === 'confirmed' || status === 'failed';

type StepState = 'done' | 'now' | '';

/** The four steps with their state, and how far the track is filled (0 to 1); `failed` has no step current. */
export const lifecycle = (status: JobStatus): { states: StepState[]; fill: number } => {
  const position = JOB_STEPS.findIndex(([step]) => step === status);
  const confirmed = status === 'confirmed';
  const last = JOB_STEPS.length - 1;

  return {
    states: JOB_STEPS.map((_step, index): StepState => {
      if (index < position || confirmed) {
        return 'done';
      }

      return index === position ? 'now' : '';
    }),
    fill: confirmed ? 1 : Math.max(0, position) / last,
  };
};

/** The line under the rail's balance: "Step 3 of 4", or that the job failed. */
export const railNote = (status: JobStatus): string => {
  if (status === 'failed') {
    return JOB_FAILED_NOTE;
  }

  const position = Math.max(
    0,
    JOB_STEPS.findIndex(([step]) => step === status),
  );

  return stepNote(position + 1, JOB_STEPS.length);
};

/** "What it means" (FR-026). A confirmed `score` says scoring is not a verdict on the evidence. */
export const statusMeaning = (kind: string, status: JobStatus): string => {
  switch (status) {
    case 'confirmed':
      return kind === 'score' ? MEANINGS.scored : MEANINGS.confirmed;
    case 'failed':
      return MEANINGS.failed;
    case 'sent':
      return MEANINGS.sent;
    default:
      return MEANINGS.waiting;
  }
};

const POLL_MIN_MS = 2000;
const POLL_MAX_MS = 5000;
const POLL_GROWTH = 1.5;

/** Polling (NFR-063): 2 s, then 1.5 times longer after each poll that found the same job, up to 5 s; a change starts over. */
export const pollDelay = (previous: number, changed: boolean): number =>
  changed ? POLL_MIN_MS : Math.min(POLL_MAX_MS, previous * POLL_GROWTH);

export const FIRST_POLL_MS = POLL_MIN_MS;
