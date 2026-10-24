// Pure display rules of the accounts screens (SR-7). `safeReturn` lives in `app/return-to.ts`, shared with the guards.
import { ApiError } from '../../shared/api/errors';
import type { Role } from '../../app/route-handle';
import type { Profile } from '../../app/session/session';
import {
  JOB_LINK_OPERATIONS,
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
