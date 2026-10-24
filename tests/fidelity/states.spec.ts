// docs/phases.md F0a: "App-wide UI-gap patterns (FE/ui-gaps.md §2): loading (1), read failure (8), session expired (12),
// forbidden (13), offline (14), timeout (15), error toast (20), time zone (21), dialog modality (23), display name null
// (24) reach their drawn states on the shell rows". One test per pattern, in the real app: no ?state= switch, the
// states are driven by what the network answers (page.route, context.setOffline) and by Playwright's clock.
// D-7: a reload forgets the login, so a signed-in test signs in through the form and then moves only inside the app.
import type { Page } from '@playwright/test';
import { FROZEN_CLOCK } from './fidelity.setup';
import { SARI, meBody, type MeProfile } from './fixtures/accounts';
import {
  ME_CALL,
  OWN_API,
  expect,
  goInApp,
  holdMe,
  refocus,
  requestsTo,
  settle,
  signInWith,
  signedInAt,
  test,
} from './helpers/flow';
import { answerMe, testLogin } from './helpers/privy';

const TREES = '/app/planter/trees';
const LOADING = 'Loading workspace…';
const ERROR_TITLE = 'Could not load this page';
const ERROR_BODY = 'Your inputs and local records are unchanged.';
const OFFLINE = 'Offline · showing saved data. Network actions are unavailable.';
const WALLET = '0x71c7656ec7ab88b098defb751b7401b5f6d8976f';
const ALEX: MeProfile = { ...SARI, role: 'donor', displayName: 'Alex', walletAddress: WALLET };
const NO_NAME: MeProfile = { ...ALEX, displayName: null };
const INVALID_TOKEN = { error: { code: 'invalid_token', message: 'The token is not valid.' } };
const UNAVAILABLE = { error: { code: 'service_unavailable', message: 'Try again shortly.' } };
const HTTP_UNAUTHORIZED = 401;
const HTTP_UNAVAILABLE = 503;
const SKELETON_AFTER_MS = 300;
const REQUEST_LIMIT_S = 30;
const SECOND_MS = 1000;
const FORMATTER = '/src/shared/format/datetime.ts';
const TEST_MS = 120_000;
// nothing in the app answers; this gate never opens, so the request hangs
const NEVER = new Promise<never>(() => undefined);

test.describe.configure({ timeout: TEST_MS });

const SHELL = 'Shell';

const workspace = (page: Page) => page.locator('main#main-content');

const pause = (page: Page) => page.clock.pauseAt(new Date(Date.parse(FROZEN_CLOCK) + SECOND_MS));

test('pattern 1 loading: a slow /me shows the workspace skeleton only after 300 ms, as a busy status', async ({
  open,
}) => {
  const { page } = await open({ row: SHELL });
  const release = Promise.withResolvers<void>();

  await signInWith(page, meBody(SARI), {
    returnTo: TREES,
    setup: (target) => holdMe(target, release.promise),
  });
  await pause(page);
  await goInApp(page, TREES);

  const status = workspace(page).getByRole('status').filter({ hasText: LOADING });

  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute('aria-busy', 'true');
  await expect(workspace(page).locator('.skeleton')).toHaveCount(0);

  await page.clock.runFor(SKELETON_AFTER_MS);
  await expect(
    workspace(page).locator('.skeleton.title, .skeleton.donor-list-skeleton'),
  ).toHaveCount(2);

  await page.clock.resume();
  release.resolve();
  await expect(status).toHaveCount(0);
  await expect(workspace(page).getByRole('heading', { name: 'S16 My trees' })).toBeVisible();
});

test('pattern 8 read failure: a 503 on /me shows "Could not load this page" and Try again re-runs only that read', async ({
  open,
}) => {
  const { page } = await open({ row: SHELL });

  await signInWith(page, UNAVAILABLE, { status: HTTP_UNAVAILABLE, returnTo: TREES });
  await expect(page.locator('#si-error')).toContainText(ERROR_TITLE);
  await goInApp(page, TREES);

  const alert = workspace(page).getByRole('alert');

  await expect(alert).toContainText(ERROR_TITLE);
  await expect(alert).toContainText(ERROR_BODY);
  await expect(alert.locator('.error-icon')).toBeVisible();
  await expect(workspace(page).getByText('S16 My trees')).toHaveCount(0);

  await answerMe(page, meBody(SARI));
  const calls = requestsTo(page, OWN_API);

  await alert.getByRole('button', { name: 'Try again' }).click();

  await expect(workspace(page).getByRole('heading', { name: 'S16 My trees' })).toBeVisible();
  expect(calls.map((call) => `${call.method()} ${new URL(call.url()).pathname}`)).toEqual([
    'GET /api/v1/me',
  ]);
});

test('pattern 12 session expired: a 401 mid-session replaces the page with /sign-in and the session-ended banner', async ({
  open,
}) => {
  const { page } = await open({ row: SHELL });

  await signedInAt(page, SARI, TREES);
  await answerMe(page, INVALID_TOKEN, HTTP_UNAUTHORIZED);
  const calls = requestsTo(page, ME_CALL);
  const historyBefore = await page.evaluate(() => window.history.length);

  await refocus(page);

  await expect(page).toHaveURL(`/sign-in?returnTo=${encodeURIComponent(TREES)}`);
  await expect(page.locator('[data-copy="COPY-400"]')).toBeVisible();
  await expect(
    page.getByRole('status').filter({ has: page.locator('[data-copy="COPY-400"]') }),
  ).toBeVisible();
  await expect(page.locator('.si-lead')).toContainText(
    'Afterwards you’ll return to where you left off.',
  );
  expect(await page.evaluate(() => window.history.length)).toBe(historyBefore);
  expect(calls).toHaveLength(1);
});

test('pattern 13 forbidden: a donor on /app/planter/trees sees "Role unavailable" and no page request is sent', async ({
  open,
}) => {
  const { page } = await open({ row: SHELL });

  await signInWith(page, meBody(ALEX), { returnTo: TREES });
  const calls = requestsTo(page, OWN_API);

  await page.getByRole('button', { name: /^Continue to/ }).click();

  await expect(workspace(page).getByRole('heading', { name: 'Role unavailable' })).toBeVisible();
  await expect(workspace(page).getByText('This screen is for Planter accounts.')).toBeVisible();
  await expect(workspace(page).getByRole('heading', { name: 'S16 My trees' })).toHaveCount(0);
  await settle(page);
  expect(
    calls.map((call) => new URL(call.url()).pathname).filter((path) => path !== '/api/v1/me'),
  ).toEqual([]);
});

test('pattern 14 offline: going offline shows the callout and disables the page fieldset, coming back clears both', async ({
  open,
}) => {
  const { page } = await open({ row: SHELL });

  await signedInAt(page, SARI, TREES);
  const body = workspace(page).locator('fieldset.ws-state-body');

  await expect(workspace(page).getByText(OFFLINE)).toHaveCount(0);
  await page.context().setOffline(true);

  await expect(workspace(page).locator('p.ws-callout')).toHaveText(OFFLINE);
  await expect(body).toHaveJSProperty('disabled', true);
  await expect(workspace(page).getByRole('heading', { name: 'S16 My trees' })).toBeVisible();

  await page.context().setOffline(false);
  await expect(workspace(page).getByText(OFFLINE)).toHaveCount(0);
  await expect(body).toHaveJSProperty('disabled', false);
});

test('pattern 15 timeout: a /me that never answers is cut off at about 30 s and shows the read-failure state', async ({
  open,
}) => {
  const { page } = await open({ row: SHELL });
  const calls = requestsTo(page, ME_CALL);

  await signInWith(page, meBody(SARI), {
    returnTo: TREES,
    setup: (target) => holdMe(target, NEVER),
  });
  await goInApp(page, TREES);
  await pause(page);
  const status = workspace(page).getByRole('status').filter({ hasText: LOADING });

  await expect(status).toBeVisible();
  // the request began a few real seconds ago at most; 27 s later it is still waiting, 4 s after that it has been cut
  await page.clock.runFor((REQUEST_LIMIT_S - 3) * SECOND_MS);
  await expect(status).toBeVisible();
  await expect(workspace(page).getByRole('alert')).toHaveCount(0);

  await page.clock.runFor(4 * SECOND_MS);
  await expect(workspace(page).getByRole('alert')).toContainText(ERROR_TITLE);
  await expect(workspace(page).getByRole('button', { name: 'Try again' })).toBeVisible();
  // one request, cut off once: the app never sends it again by itself
  expect(calls).toHaveLength(1);
});

test.fixme('pattern 20 error toast: no shell row raises an error toast yet', () => {
  // The only `notify` caller on a shell row is Sign out ("Signed out", the plain variant). The error variant
  // (`notify(message, true)`, `.toast-error`) belongs to S04/S09/S11/S26 copy failures, whose pages are still stubs.
});

test("pattern 21 time zone: the shared formatter prints the viewer's zone, Asia/Jakarta and UTC differ", async ({
  open,
}) => {
  const instant = '2026-10-23T03:02:00.000Z';
  const show = async (row: string) => {
    const { page } = await open({ row });

    await page.goto('/campaigns');

    return page.evaluate(
      async ([when, module]) => {
        const { localDate, localDateTime } = await import(/* @vite-ignore */ module!);

        return [localDateTime(when), localDate(when)];
      },
      [instant, FORMATTER],
    );
  };

  // Shell is rendered in Asia/Jakarta and S16 in UTC (fidelity.md §2 Timezone)
  expect(await show(SHELL)).toEqual(['23 Oct 2026, 10:02 GMT+7', '23 Oct 2026']);
  expect(await show('S16')).toEqual(['23 Oct 2026, 03:02 UTC', '23 Oct 2026']);
});

test.fixme('pattern 23 dialog modality: no shell row has a dialog yet', () => {
  // `shared/ui/Dialog` exists and is tested alone, but nothing mounts it: D09/D10 live on S15, which is a stub.
});

test('pattern 24 display name null: the account menu shows the part of the sign-in email before "@"', async ({
  open,
}) => {
  const { page } = await open({ row: SHELL });
  const name = testLogin().email.split('@')[0] ?? '';

  await signedInAt(page, NO_NAME, TREES);

  const menu = page.locator(`summary[aria-label="Account: ${name}, Donor"]`);

  await expect(menu).toHaveCount(1);
  await expect(page.getByTestId('account-name')).toHaveText(name);
  await expect(menu.locator('.donor-avatar')).toHaveText(name.slice(0, 1).toUpperCase());
  await expect(page.locator('.account-pop-head strong')).toHaveText(name);
});
