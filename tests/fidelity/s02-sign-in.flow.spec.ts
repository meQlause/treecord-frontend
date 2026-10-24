// docs/FE/features/s02-sign-in.md §7: one test per criterion SI-AC1..SI-AC18, asserting its Then column under the
// fidelity.md §2 conditions. Sign-in uses the real Privy test account (backend/.env); the provider's error answers are
// scripted with page.route, and `GET /api/v1/me` is answered as accounts.md §1 says (the backend does not run).
import type { Page } from '@playwright/test';
import { FIRST_SIGN_IN, SARI, meBody, type MeProfile } from './fixtures/accounts';
import {
  ME_CALL,
  SARI_EMAIL,
  VERIFY_CALL,
  expect,
  privyVerdict,
  requestsTo,
  sessionEmail,
  settle,
  signInWith,
  test,
  toCodeStep,
  type Verdict,
} from './helpers/flow';

const CAMPAIGN = '/campaigns/0x0000000000000000000000000000000000000003';
const NOTHING_SENT = 'Nothing is sent automatically; review any action again before confirming it.';
const SIGN_IN = 'Sign in';
const VERIFY = 'Verify';
const SEND_CODE = 'Send code';
const CODE_FIELD = 'Verification code';
const ERROR_ID = '#si-error';
const WALLET = '0x71c7656ec7ab88b098defb751b7401b5f6d8976f';
const RAKA: Partial<MeProfile> = { role: 'operator', displayName: 'Raka' };
const WALLET_LINKED = {
  error: { code: 'wallet_already_linked', message: 'Wallet already linked' },
};
const UNAVAILABLE = { error: { code: 'service_unavailable', message: 'Service unavailable' } };
const HTTP_CONFLICT = 409;
const HTTP_UNAVAILABLE = 503;
const TEST_MS = 90_000;
// the SDK tries an unreachable provider several times, with growing pauses, before it gives up (about 20 s)
const SDK_GIVES_UP_MS = 45_000;

test.describe.configure({ timeout: TEST_MS });

const stepOf = (page: Page, label: string) => page.getByRole('listitem').filter({ hasText: label });

const ready = (page: Page) => page.getByRole('status').filter({ hasText: 'You’re in.' });

const header = (page: Page) => page.getByRole('banner');

/** The Code step with the provider scripted to answer `verdict` on "Verify". */
const verifyAnswered = async (page: Page, verdict: Verdict): Promise<void> => {
  await privyVerdict(page, verdict);
  await toCodeStep(page);
  await page.getByLabel(CODE_FIELD).fill('123456');
  await page.getByRole('button', { name: VERIFY }).click();
};

test('SI-AC1 an empty or malformed email leaves the Email step current and the input invalid', async ({
  open,
}) => {
  const { page } = await open();

  await page.goto('/sign-in');
  const input = page.getByLabel('Email');

  for (const typed of ['', 'sari@']) {
    await input.fill(typed);
    await page.getByRole('button', { name: SEND_CODE }).click();
    await expect(stepOf(page, 'Email')).toHaveAttribute('aria-current', 'step');
    expect(await input.evaluate((field: HTMLInputElement) => field.validity.valid)).toBe(false);
  }
});

test('SI-AC2 sending a code moves to the Code step with the email shown and Email checked', async ({
  open,
}) => {
  const { page } = await open();

  await toCodeStep(page, SARI_EMAIL);

  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await expect(page.getByText('Enter the six-digit code sent to')).toHaveText(
    `Enter the six-digit code sent to ${SARI_EMAIL}.`,
  );
  await expect(stepOf(page, 'Code')).toHaveAttribute('aria-current', 'step');
  await expect(stepOf(page, 'Email').locator('svg')).toBeVisible();
  await expect(stepOf(page, 'Email')).not.toHaveAttribute('aria-current', 'step');
});

test('SI-AC3 non-digits are stripped as typed and a short code sends no verify call', async ({
  open,
}) => {
  const { page } = await open();

  await toCodeStep(page);
  const verifyCalls = requestsTo(page, VERIFY_CALL);
  const code = page.getByLabel(CODE_FIELD);

  await code.pressSequentially('12a3');
  await expect(code).toHaveValue('123');
  await page.getByRole('button', { name: VERIFY }).click();
  await settle(page);

  expect(verifyCalls).toHaveLength(0);
});

test('SI-AC4 "Use a different email" keeps the email and clears the code', async ({ open }) => {
  const { page } = await open();

  await toCodeStep(page, SARI_EMAIL);
  await page.getByLabel(CODE_FIELD).fill('123456');
  await page.getByRole('button', { name: 'Use a different email' }).click();

  await expect(page.getByRole('heading', { name: SIGN_IN })).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue(SARI_EMAIL);
  await page.getByRole('button', { name: SEND_CODE }).click();
  await expect(page.getByLabel(CODE_FIELD)).toHaveValue('');
});

test('SI-AC5 a wrong code shows the incorrect-code alert on the Code step', async ({ open }) => {
  const { page } = await open();

  await verifyAnswered(page, 'invalid');

  const alert = page.locator(ERROR_ID);
  const code = page.getByLabel(CODE_FIELD);

  await expect(alert).toHaveAttribute('role', 'alert');
  await expect(alert).toHaveText('That code is incorrect. Check the six digits and try again.');
  await expect(code).toHaveAttribute('aria-invalid', 'true');
  await expect(code).toHaveAttribute('aria-describedby', 'si-error');
  await expect(page.getByText(SARI_EMAIL)).toBeVisible();
});

test('SI-AC6 an expired code shows the expired-code alert', async ({ open }) => {
  const { page } = await open();

  await verifyAnswered(page, 'expired');

  await expect(page.locator(ERROR_ID)).toHaveText(
    'That code has expired. Use a different email or start again for a new one.',
  );
});

test('SI-AC7 an unreachable provider shows the provider-unavailable alert', async ({ open }) => {
  const { page } = await open();

  await verifyAnswered(page, 'unreachable');

  await expect(page.locator(ERROR_ID)).toHaveText(
    'The sign-in provider is unavailable. Try again in a moment.',
    { timeout: SDK_GIVES_UP_MS },
  );
});

test('SI-12 a rate-limited verify (Privy 429) is not called a wrong code', async ({ open }) => {
  const { page } = await open();

  await verifyAnswered(page, 'limited');

  await expect(page.locator(ERROR_ID)).toHaveText(
    'The sign-in provider is unavailable. Try again in a moment.',
  );
});

test('SI-AC8 a wallet still being prepared shows its alert, no Continue and no Copy wallet', async ({
  open,
}) => {
  const { page } = await open();

  await signInWith(page, meBody(FIRST_SIGN_IN));

  await expect(page.locator(ERROR_ID)).toHaveText(
    'Your wallet is still being prepared. Try again in a moment.',
  );
  await expect(page.getByRole('button', { name: /^Continue/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy wallet' })).toHaveCount(0);
});

test('SI-AC9 a wallet already linked shows the blocking alert, no Ready step and no account menu', async ({
  open,
}) => {
  const { page } = await open();

  await signInWith(page, WALLET_LINKED, { status: HTTP_CONFLICT });

  const alert = page.getByTestId('si-error');

  await expect(alert).toBeVisible();
  await expect(alert).toHaveAttribute('role', 'alert');
  await expect(page.getByText('You’re in.')).toHaveCount(0);
  await expect(page.locator('summary[aria-label^="Account:"]')).toHaveCount(0);
});

test('SI-AC10 Ready names the profile and "Continue to your profile" opens /app/profile', async ({
  open,
}) => {
  const { page } = await open();

  await signInWith(page, meBody(SARI), { returnTo: '/app/profile' });

  await expect(ready(page)).toBeVisible();
  // the document says sari@example.com; the session email is the Privy test account's own address
  await expect(ready(page)).toContainText(
    `Signed in as Sari · Planter (${sessionEmail()}). ${NOTHING_SENT}`,
  );
  await page.getByRole('button', { name: 'Continue to your profile' }).click();
  await expect(page).toHaveURL('/app/profile');
});

test('SI-AC11 an outside returnTo falls back to the workspace and ends on /app/planter/trees', async ({
  open,
}) => {
  for (const outside of ['https://evil.example', '//evil.example']) {
    const { page } = await open();

    await signInWith(page, meBody(SARI), { returnTo: outside });
    await page.getByRole('button', { name: 'Continue to your workspace' }).click();

    await expect(page).toHaveURL('/app/planter/trees');
  }
});

test('SI-AC12 a campaign returnTo reads "the campaign you were viewing" and opens it with no review open', async ({
  open,
}) => {
  const { page } = await open();

  await page.goto(`/sign-in?returnTo=${encodeURIComponent(CAMPAIGN)}`);
  await expect(page.locator('.si-lead')).toHaveText(
    'We’ll send a six-digit code to your email. Afterwards you’ll return to the campaign you were viewing.',
  );
  await signInWith(page, meBody(SARI), { returnTo: CAMPAIGN });
  await page.getByRole('button', { name: 'Continue to the campaign you were viewing' }).click();

  await expect(page).toHaveURL(CAMPAIGN);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(/review/i)).toHaveCount(0);
});

test('SI-AC13 "Sign in" on /carbon opens /sign-in?returnTo=%2Fcarbon, led by "carbon credits"', async ({
  open,
}) => {
  const { page } = await open();

  await page.goto('/carbon');
  await header(page).getByRole('button', { name: SIGN_IN }).click();

  await expect(page).toHaveURL('/sign-in?returnTo=%2Fcarbon');
  await expect(page.locator('.si-lead')).toHaveText(
    'We’ll send a six-digit code to your email. Afterwards you’ll return to carbon credits.',
  );
});

test('SI-AC14 "Sign in" on /sign-in opens /sign-in?returnTo=%2Fapp', async ({ open }) => {
  const { page } = await open();

  await page.goto('/sign-in');
  await header(page).getByRole('button', { name: SIGN_IN }).click();

  await expect(page).toHaveURL('/sign-in?returnTo=%2Fapp');
});

test('SI-AC15 a first sign-in with a wallet ends on /app/donor, "· Donor (" in the Ready line', async ({
  open,
}) => {
  const { page } = await open();

  await signInWith(page, meBody(FIRST_SIGN_IN, { walletAddress: WALLET }));

  await expect(ready(page)).toContainText('· Donor (');
  await page.getByRole('button', { name: 'Continue to your workspace' }).click();
  await expect(page).toHaveURL('/app/donor');
});

test('SI-AC16 an operator is named by the profile; there is no account picker or role control', async ({
  open,
}) => {
  const { page } = await open();

  await signInWith(page, meBody(SARI, RAKA));

  await expect(ready(page)).toContainText('Raka · Operator');
  await expect(page.locator('[aria-label="Accounts"]')).toHaveCount(0);

  for (const role of ['combobox', 'radio', 'radiogroup', 'tab', 'listbox'] as const) {
    await expect(page.getByRole(role)).toHaveCount(0);
  }
});

test('SI-AC17 a 503 on /me shows "Could not load this page"; "Verify" re-reads /me once, never the provider', async ({
  open,
}) => {
  const { page } = await open();

  await signInWith(page, UNAVAILABLE, { status: HTTP_UNAVAILABLE });
  const alert = page.locator(ERROR_ID);

  await expect(alert).toContainText('Could not load this page');
  await settle(page);
  const verifyCalls = requestsTo(page, VERIFY_CALL);
  const meCalls = requestsTo(page, ME_CALL);

  await page.getByRole('button', { name: VERIFY }).click();
  await expect(alert).toContainText('Could not load this page');
  await settle(page);

  expect(meCalls).toHaveLength(1);
  expect(verifyCalls).toHaveLength(0);
});

test('SI-AC18 Ready without a display name prints the part of the email before "@"', async ({
  open,
}) => {
  const { page } = await open();

  await signInWith(page, meBody(FIRST_SIGN_IN, { walletAddress: WALLET }));

  // sari@example.com in the document; the Privy test account's own address here
  await expect(page.getByTestId('si-name')).toHaveText(sessionEmail().split('@')[0] ?? '');
});
