import { describe, expect, it } from 'vitest';
import {
  OUTCOME_ERROR,
  SIGN_IN_PROVIDER,
  jobLinks,
  profileOutcome,
  signInOutcome,
  whereLabel,
} from '../../../../src/features/accounts/accounts.rules';
import { ApiError } from '../../../../src/shared/api/errors';

const profile = (walletAddress: string | null) => ({
  id: 'p',
  role: 'planter' as const,
  displayName: 'Sari',
  walletAddress,
  email: 'sari@example.com',
  isBuyer: false,
  carbonRightsAgreementAccepted: true,
});

const apiError = (code: string, status: number) => new ApiError({ code, message: code, status });

describe('whereLabel (FR-004)', () => {
  it.each([
    ['/app', 'your workspace'],
    ['/app/profile', 'your profile'],
    ['/campaigns/0x0000000000000000000000000000000000000003', 'the campaign you were viewing'],
    ['/carbon', 'carbon credits'],
    ['/carbon/101', 'carbon credits'],
    ['/app/planter/trees', 'where you left off'],
    ['/campaigns', 'where you left off'],
  ])('%s → %s', (target, expected) => {
    expect(whereLabel(target)).toBe(expected);
  });
});

describe('signInOutcome (FR-003)', () => {
  it.each([
    [
      'a wrong or old code (Privy cannot tell them apart)',
      new Error('Invalid or expired verification code'),
      'invalid',
    ],
    ['a code that says only "expired"', new Error('Verification code expired'), 'expired'],
    ['an unreachable provider', new TypeError('Failed to fetch'), 'unavailable'],
    ['a request timeout', { privyErrorCode: 'client_request_timeout' }, 'unavailable'],
    ['a server error', { status: 503, message: 'x' }, 'unavailable'],
    [
      'a rate limit (Privy: 429 too_many_requests)',
      {
        status: 429,
        code: 'too_many_requests',
        message: 'Too many requests. Please wait to try again.',
      },
      'unavailable',
    ],
    [
      'a wrong code (Privy: 422 invalid_credentials)',
      { status: 422, code: 'invalid_credentials', message: 'Invalid email and code combination' },
      'invalid',
    ],
    ['an unknown error', new Error('something else'), 'invalid'],
    ['a thrown string', 'boom', 'invalid'],
  ])('verify: %s → %s', (_label, error, expected) => {
    expect(signInOutcome(error, 'verify')).toBe(expected);
  });

  it.each([
    ['an unreachable provider', new TypeError('Failed to fetch'), 'unavailable'],
    ['a refused email', { code: 'invalid_data', status: 400, message: 'Invalid email' }, 'refused'],
    ['a rate limit', { status: 429, message: 'Too many requests' }, 'refused'],
    ['an unknown error', new Error('x'), 'refused'],
  ])('send: %s → %s', (_label, error, expected) => {
    expect(signInOutcome(error, 'send')).toBe(expected);
  });

  it('maps each outcome to its alert key', () => {
    expect(SIGN_IN_PROVIDER).toEqual({
      invalid: 'CODE_INCORRECT',
      expired: 'CODE_EXPIRED',
      unavailable: 'PROVIDER_UNAVAILABLE',
      refused: 'SEND_REFUSED',
    });
  });
});

describe('profileOutcome', () => {
  const idle = { status: 'success' as const, error: null };

  it.each([
    ['pending', { status: 'pending' as const, data: undefined, error: null }, 'loading'],
    ['a profile with a wallet', { ...idle, data: profile('0x4b9e') }, 'ready'],
    ['a profile with no wallet yet', { ...idle, data: profile(null) }, 'wallet-pending'],
    [
      '409 wallet_already_linked',
      { status: 'error' as const, data: undefined, error: apiError('wallet_already_linked', 409) },
      'linked',
    ],
    [
      '401 invalid_token',
      { status: 'error' as const, data: undefined, error: apiError('invalid_token', 401) },
      'rejected',
    ],
    [
      '401 missing_token',
      { status: 'error' as const, data: undefined, error: apiError('missing_token', 401) },
      'rejected',
    ],
    [
      '503',
      { status: 'error' as const, data: undefined, error: apiError('service_unavailable', 503) },
      'retry',
    ],
    [
      'a network failure',
      { status: 'error' as const, data: undefined, error: apiError('network', 0) },
      'retry',
    ],
    [
      'a failed refresh behind a profile',
      { status: 'error' as const, data: profile('0x4b9e'), error: apiError('internal_error', 500) },
      'ready',
    ],
  ])('%s → %s', (_label, result, expected) => {
    expect(profileOutcome(result)).toBe(expected);
  });

  it('only a wallet-pending, linked or retry outcome puts an alert on the Code step', () => {
    expect(OUTCOME_ERROR).toEqual({
      loading: null,
      ready: null,
      rejected: null,
      linked: 'WALLET_LINKED',
      'wallet-pending': 'WALLET_PENDING',
      retry: 'PROFILE_FAILED',
    });
  });
});

describe('jobLinks (FR-028, ui-gaps decision b)', () => {
  const none = { campaign: null, treeId: null };
  const campaign = '0x0000000000000000000000000000000000000003';

  it('a planter’s claim links to their slots; an operator’s does not', () => {
    expect(jobLinks('claim', none, 'planter')).toEqual([
      { label: 'View slots', to: '/app/planter/slots' },
    ]);
    expect(jobLinks('claim', none, 'operator')).toEqual([]);
  });

  it('a resolved flag links to the tree for every role', () => {
    const context = { campaign, treeId: '3091' };

    expect(jobLinks('resolve_flag', context, 'planter')).toEqual([
      { label: 'View tree', to: '/trees/3091' },
    ]);
    expect(jobLinks('resolve_flag', context, 'operator')).toEqual([
      { label: 'View tree', to: '/trees/3091' },
      { label: 'Back to operations', to: `/app/operator/campaigns/${campaign}` },
    ]);
  });

  it('"Back to operations" is for operators with a campaign only', () => {
    expect(jobLinks('issue', { campaign, treeId: null }, 'operator')).toEqual([
      { label: 'Back to operations', to: `/app/operator/campaigns/${campaign}` },
    ]);
    expect(jobLinks('issue', { campaign, treeId: null }, 'planter')).toEqual([]);
    expect(jobLinks('issue', none, 'operator')).toEqual([]);
  });

  it('no tree id, no tree link', () => {
    expect(jobLinks('resolve_flag', none, 'auditor')).toEqual([]);
  });
});
