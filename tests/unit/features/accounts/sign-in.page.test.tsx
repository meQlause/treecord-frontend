import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RouteObject } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Component as SignIn } from '../../../../src/features/accounts/sign-in.page';
import { ApiError } from '../../../../src/shared/api/errors';
import {
  FIRST_SIGN_IN,
  SARI,
  apiMock,
  privyState,
  renderRoutes,
  resetPrivy,
  signedInAs,
} from '../../session-mocks';

vi.mock('@privy-io/react-auth', async () => (await import('../../session-mocks')).privyModule);
vi.mock(
  '../../../../src/app/session/api',
  async () => (await import('../../session-mocks')).apiModule,
);
vi.mock(
  '../../../../src/app/session/config',
  async () => (await import('../../session-mocks')).configModule,
);

const EMAIL = 'sari@example.com';
const INVALID = 'That code is incorrect. Check the six digits and try again.';
const EXPIRED = 'That code has expired. Use a different email or start again for a new one.';
const UNAVAILABLE = 'The sign-in provider is unavailable. Try again in a moment.';
const WALLET_PENDING = 'Your wallet is still being prepared. Try again in a moment.';

const routes: RouteObject[] = [
  { path: '/sign-in', Component: SignIn },
  { path: '/app', Component: () => <p>app home</p> },
  { path: '/app/profile', Component: () => <p>profile page</p> },
  { path: '/campaigns/:address', Component: () => <p>campaign page</p> },
];

const open = (returnTo?: string, state?: unknown) =>
  renderRoutes(
    routes,
    returnTo === undefined ? '/sign-in' : `/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
    state,
  );

/** The provider accepts the code: Privy flips to signed in, as the SDK does. */
const loginSucceeds = (address = EMAIL) => {
  privyState.loginWithCode = vi.fn(() => {
    signedInAs(address);

    return Promise.resolve();
  });
};

const apiFails = (code: string, status: number) =>
  apiMock.mockRejectedValue(new ApiError({ code, message: code, status }));

const toCodeStep = async (email = EMAIL) => {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
  await screen.findByText('Check your email');
};

const verify = async (code = '123456') => {
  await userEvent.type(screen.getByLabelText('Verification code'), code);
  await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
};

beforeEach(() => {
  resetPrivy();
  apiMock.mockReset();
});

describe('S02 Email step', () => {
  it('SI-1: the lead names where the visitor returns to, from a validated returnTo', () => {
    open('/app/profile');

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'We’ll send a six-digit code to your email. Afterwards you’ll return to your profile.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Email', { selector: 'li' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });

  it.each([
    ['/campaigns/0x0000000000000000000000000000000000000003', 'the campaign you were viewing'],
    ['/carbon', 'carbon credits'],
    ['https://evil.example', 'your workspace'],
    ['//evil.example', 'your workspace'],
    ['/app/planter/trees', 'where you left off'],
  ])('SI-AC12/13: returnTo %s → "%s"', (returnTo, where) => {
    open(returnTo);

    expect(screen.getByText(new RegExp(`return to ${where}\\.$`))).toBeInTheDocument();
  });

  it('SI-AC16: there is no account picker and no role control', () => {
    open();

    expect(screen.queryByLabelText('Accounts')).toBeNull();
  });

  it('SI-2: an empty or malformed email is stopped by the field and nothing is sent', async () => {
    open();
    const field = screen.getByLabelText('Email');

    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));

    expect((field as HTMLInputElement).validity.valid).toBe(false);

    await userEvent.type(field, 'sari@');
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));

    expect((field as HTMLInputElement).validity.valid).toBe(false);
    expect(privyState.sendCode).not.toHaveBeenCalled();
    expect(screen.getByText('Email', { selector: 'li' })).toHaveAttribute('aria-current', 'step');
  });

  it('SI-6: a sent code opens the Code step with the email, "Code" current and "Email" done', async () => {
    open();
    await toCodeStep();

    expect(privyState.sendCode).toHaveBeenCalledWith({ email: EMAIL });
    expect(screen.getByText(EMAIL, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText(/Enter the six-digit code sent to/)).toHaveTextContent(
      `Enter the six-digit code sent to ${EMAIL}.`,
    );
    expect(screen.getByText('Code', { selector: 'li' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Email', { selector: 'li' })).toHaveClass('done');
    expect(screen.getByText('Email', { selector: 'li' }).querySelector('svg')).not.toBeNull();
  });

  it('SI-3: while the code is being sent the button is busy and the field read-only', async () => {
    privyState.sendCode = vi.fn(() => new Promise<void>(() => undefined));
    open();

    await userEvent.type(screen.getByLabelText('Email'), EMAIL);
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));

    const busy = await screen.findByRole('button', { name: 'Processing…' });

    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly');
  });

  it('SI-4: an unreachable provider while sending shows the alert under the field and keeps the email', async () => {
    privyState.sendCode = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    open();

    await userEvent.type(screen.getByLabelText('Email'), EMAIL);
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));

    const alert = await screen.findByTestId('si-error');

    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveAttribute('id', 'si-error');
    expect(alert).toHaveTextContent(UNAVAILABLE);
    expect(screen.getByLabelText('Email')).toHaveValue(EMAIL);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-describedby', 'si-error');
  });

  it('SI-5: any other refusal shows the COPY-102 placeholder', async () => {
    privyState.sendCode = vi.fn(() => Promise.reject(new Error('Invalid email address')));
    const { container } = open();

    await userEvent.type(screen.getByLabelText('Email'), EMAIL);
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));

    await screen.findByTestId('si-error');

    expect(container.querySelector('[data-copy="COPY-102"]')).not.toBeNull();
  });
});

describe('S02 Code step', () => {
  it('SI-AC3: non-digits are stripped as typed, and a short code sends no verify call', async () => {
    open();
    await toCodeStep();

    await userEvent.type(screen.getByLabelText('Verification code'), '12a3');

    expect(screen.getByLabelText('Verification code')).toHaveValue('123');

    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(privyState.loginWithCode).not.toHaveBeenCalled();
  });

  it('SI-7: the field is six digits, numeric, one-time-code', async () => {
    open();
    await toCodeStep();
    const field = screen.getByLabelText('Verification code');

    expect(field).toHaveAttribute('pattern', '[0-9]{6}');
    expect(field).toHaveAttribute('inputmode', 'numeric');
    expect(field).toHaveAttribute('autocomplete', 'one-time-code');
    expect(field).toHaveAttribute('maxlength', '6');
    expect(field).toBeRequired();
  });

  it('SI-AC4: "Use a different email" returns to Email with the email kept and the code cleared', async () => {
    open();
    await toCodeStep();
    await userEvent.type(screen.getByLabelText('Verification code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Use a different email' }));

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue(EMAIL);

    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await screen.findByText('Check your email');

    expect(screen.getByLabelText('Verification code')).toHaveValue('');
    expect(privyState.logout).not.toHaveBeenCalled();
  });

  it('SI-8: while verifying the button is busy and the code read-only', async () => {
    privyState.loginWithCode = vi.fn(() => new Promise<void>(() => undefined));
    open();
    await toCodeStep();
    await verify();

    const busy = await screen.findByRole('button', { name: 'Processing…' });

    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByLabelText('Verification code')).toHaveAttribute('readonly');
  });

  it.each([
    ['SI-AC5', new Error('Invalid or expired verification code'), INVALID],
    ['SI-AC6', new Error('Verification code expired'), EXPIRED],
    ['SI-AC7', new TypeError('Failed to fetch'), UNAVAILABLE],
  ])(
    '%s: the provider’s answer becomes the alert, with email and code kept',
    async (_ac, error, text) => {
      privyState.loginWithCode = vi.fn(() => Promise.reject(error));
      open();
      await toCodeStep();
      await verify();

      const alert = await screen.findByTestId('si-error');
      const field = screen.getByLabelText('Verification code');

      expect(alert).toHaveTextContent(text);
      expect(alert).toHaveAttribute('role', 'alert');
      expect(field).toHaveAttribute('aria-invalid', 'true');
      expect(field).toHaveAttribute('aria-describedby', 'si-error');
      expect(field).toHaveValue('123456');
      expect(screen.getByText(EMAIL, { selector: 'strong' })).toBeInTheDocument();
      expect(apiMock).not.toHaveBeenCalled();
    },
  );
});

describe('S02 Ready', () => {
  it('SI-AC10: Ready names the person, role and email, and Continue opens the returnTo', async () => {
    apiMock.mockResolvedValue({ profile: SARI });
    loginSucceeds();
    const { router } = open('/app/profile');

    await toCodeStep();
    await verify();

    const done = await screen.findByRole('status');

    expect(done).toHaveTextContent('You’re in.');
    expect(done).toHaveTextContent(
      'Signed in as Sari · Planter (sari@example.com). Nothing is sent automatically; review any action again before confirming it.',
    );
    expect(screen.getByText('Ready', { selector: 'li' })).toHaveAttribute('aria-current', 'step');

    await userEvent.click(screen.getByRole('button', { name: 'Continue to your profile' }));

    expect(router.state.location.pathname).toBe('/app/profile');
    expect(await screen.findByText('profile page')).toBeInTheDocument();
  });

  it('SI-AC16: an operator reads "Raka · Operator"', async () => {
    apiMock.mockResolvedValue({ profile: { ...SARI, role: 'operator', displayName: 'Raka' } });
    loginSucceeds();
    open();
    await toCodeStep();
    await verify();

    expect(await screen.findByRole('status')).toHaveTextContent('Raka · Operator');
  });

  it('SI-AC18 / SI-17: no display name shows the email before "@" in the same element', async () => {
    apiMock.mockResolvedValue({ profile: { ...SARI, displayName: null } });
    loginSucceeds();
    open();
    await toCodeStep();
    await verify();

    expect(await screen.findByTestId('si-name')).toHaveTextContent(/^sari$/);
  });

  it('SI-20: a long name is shown whole, in a wrapping element', async () => {
    const long = 'N'.repeat(80);

    apiMock.mockResolvedValue({ profile: { ...SARI, displayName: long } });
    loginSucceeds();
    open();
    await toCodeStep();
    await verify();

    expect(await screen.findByTestId('si-name')).toHaveTextContent(long);
    expect(screen.getByTestId('si-name')).toHaveClass('wrap-any');
  });

  it.each([['https://evil.example'], ['//evil.example']])(
    'SI-AC11: returnTo %s is ignored: "Continue to your workspace" opens /app',
    async (returnTo) => {
      apiMock.mockResolvedValue({ profile: SARI });
      loginSucceeds();
      const { router } = open(returnTo);

      await toCodeStep();
      await verify();
      await userEvent.click(
        await screen.findByRole('button', { name: 'Continue to your workspace' }),
      );

      expect(router.state.location.pathname).toBe('/app');
    },
  );

  it('SI-AC12: a campaign returnTo comes back to that campaign', async () => {
    const address = '0x0000000000000000000000000000000000000003';

    apiMock.mockResolvedValue({ profile: SARI });
    loginSucceeds();
    const { router } = open(`/campaigns/${address}`);

    await toCodeStep();
    await verify();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Continue to the campaign you were viewing' }),
    );

    expect(router.state.location.pathname).toBe(`/campaigns/${address}`);
  });
});

describe('S02 wallet and profile outcomes', () => {
  it('SI-AC8 / SI-13: no wallet yet is an alert with no Continue; Verify then re-reads /me only', async () => {
    apiMock.mockResolvedValueOnce({ profile: FIRST_SIGN_IN });
    loginSucceeds();
    open();
    await toCodeStep();
    await verify();

    expect(await screen.findByTestId('si-error')).toHaveTextContent(WALLET_PENDING);
    expect(screen.queryByRole('button', { name: /^Continue/ })).toBeNull();
    expect(screen.queryByText('You’re in.')).toBeNull();
    expect(screen.queryByRole('button', { name: /Copy wallet/ })).toBeNull();

    apiMock.mockResolvedValueOnce({
      profile: { ...FIRST_SIGN_IN, walletAddress: SARI.walletAddress },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('You’re in.')).toBeInTheDocument();
    expect(privyState.loginWithCode).toHaveBeenCalledTimes(1);
    expect(apiMock).toHaveBeenCalledTimes(2);
  });

  it('SI-AC9 / SI-9: 409 wallet_already_linked is an alert, the session is ended, there is no Ready', async () => {
    apiFails('wallet_already_linked', 409);
    loginSucceeds();
    const { container } = open();

    await toCodeStep();
    await verify();

    const alert = await screen.findByTestId('si-error');

    expect(alert).toHaveAttribute('role', 'alert');
    expect(container.querySelector('[data-copy="COPY-008"]')).not.toBeNull();
    await waitFor(() => expect(privyState.logout).toHaveBeenCalledOnce());
    expect(screen.queryByText('You’re in.')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    // still there after the SDK reports signed out
    expect(screen.getByTestId('si-error')).toBeInTheDocument();
  });

  it('SI-AC17 / SI-14: a 503 on /me is the retry alert; Verify again sends one /me and no new verify', async () => {
    apiFails('service_unavailable', 503);
    loginSucceeds();
    open();
    await toCodeStep();
    await verify();

    expect(await screen.findByTestId('si-error')).toHaveTextContent('Could not load this page');
    expect(apiMock).toHaveBeenCalledTimes(1);

    apiMock.mockReset();
    apiMock.mockResolvedValue({ profile: SARI });
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('You’re in.')).toBeInTheDocument();
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(privyState.loginWithCode).toHaveBeenCalledTimes(1);
  });

  it('SI-15: a refused token ends the session and starts over with the email kept', async () => {
    apiFails('invalid_token', 401);
    loginSucceeds();
    open();
    await toCodeStep();
    await verify();

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue(EMAIL);
    expect(privyState.logout).toHaveBeenCalledOnce();
  });
});

describe('S02 around the card', () => {
  it('SI-0: while Privy is not ready, the workspace loading state shows', () => {
    privyState.ready = false;
    open();

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading workspace…')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).toBeNull();
  });

  it('SI-18: arriving with a session goes straight to Ready, with the session’s email', async () => {
    apiMock.mockResolvedValue({ profile: SARI });
    signedInAs('sari@example.com');
    open('/app/profile');

    expect(await screen.findByText('You’re in.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('(sari@example.com)');
    expect(privyState.sendCode).not.toHaveBeenCalled();
    expect(privyState.loginWithCode).not.toHaveBeenCalled();
  });

  it('"Use a different email" with a session ends it first', async () => {
    apiMock.mockResolvedValue({ profile: FIRST_SIGN_IN });
    signedInAs();
    open();

    await screen.findByTestId('si-error');
    await userEvent.click(screen.getByRole('button', { name: 'Use a different email' }));

    expect(privyState.logout).toHaveBeenCalledOnce();
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('pattern 12: the session-ended banner shows above the card only when a guard sent the visitor', () => {
    const { container, unmount } = open('/app/profile', { reason: 'session-expired' });

    expect(container.querySelector('[data-copy="COPY-400"]')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveClass('state-banner');

    unmount();
    const second = open('/app/profile');

    expect(second.container.querySelector('[data-copy="COPY-400"]')).toBeNull();
  });

  it('SI-19: the form is inside the workspace fieldset, so offline disables it', () => {
    open();

    expect(screen.getByLabelText('Email').closest('fieldset')).toHaveClass('ws-state-body');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('the art half is hidden from assistive technology', () => {
    const { container } = open();

    expect(container.querySelector('.si-art')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('EVERY TREE, PROVEN')).toBeInTheDocument();
  });
});
