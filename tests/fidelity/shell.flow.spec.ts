// docs/FE/features/shell.md §7: one test per acceptance criterion SH-AC1..SH-AC27, in the browser, under the
// docs/FE/fidelity.md §2 conditions. `GET /api/v1/me` is answered by page.route; the Privy session is the real one.
// D-7: a reload forgets the login, so a signed-in test signs in through the form and then only moves inside the app.
import { expect, test, type Browser, type Page } from '@playwright/test';
import { expectNoBlocked } from './fidelity.setup';
import { FIRST_SIGN_IN, SARI, meBody } from './fixtures/accounts';
import { ALEX, DEWI } from './fixtures/shell-accounts';
import { testLogin } from './helpers/privy';
import {
  PHONE,
  closeSession,
  controlMe,
  visit,
  openShell,
  type Me,
  refocus,
  sessionAs,
  signInAgain,
  sessionEnded,
  signOut,
  submitSignInForm,
  watchApi,
} from './helpers/shell';
import { standInControls, standInTallPage } from './helpers/shell-pages';

const REPORT = '/campaigns/0x0000000000000000000000000000000000000003/report';
const OPERATOR_PAGE = '/app/operator/campaigns/0x0000000000000000000000000000000000000003';
const SARI_MENU = 'Account: Sari, Planter';
const SIGNED_OUT = 'Signed out';
const SIDEBAR = 'aside[aria-label$="workspace"]';
const CURRENT_ITEM = `${SIDEBAR} nav a[aria-current="page"]`;
const DRAFT = `treecord:draft:${SARI.id}:${SARI.walletAddress}:84532:profile`;
const SLOW = 15_000;
const TOAST_MS = 4000;
const INVALID_TOKEN = { error: { code: 'invalid_token', message: 'The token is not valid.' } };
const UNAVAILABLE = { error: { code: 'service_unavailable', message: 'Try again shortly.' } };

test.setTimeout(180_000);
test.afterAll(closeSession);

const accountMenu = (page: Page, label = SARI_MENU) =>
  page.locator(`summary[aria-label="${label}"]`);

const menuDetails = (page: Page) => page.locator('details.account-menu');

const openMenu = async (page: Page, label = SARI_MENU): Promise<void> => {
  await accountMenu(page, label).click({ timeout: SLOW });
  await expect(menuDetails(page)).toHaveAttribute('open', '');
};

/** Privy signs in through the form while `GET /me` is held or failing: the session exists, the profile does not. */
const signedInButUnread = async (page: Page, meRoute: Me): Promise<void> => {
  await page.goto('/sign-in');
  await submitSignInForm(page);
  await expect.poll(meRoute.count, { timeout: SLOW }).toBeGreaterThan(0);
};

/** A new context signed in with Privy while `GET /me` answers 503; `calls` lists every API call from here on. */
const unreadSession = async (browser: Browser) => {
  const shell = await openShell(browser);
  const meRoute = await controlMe(shell.page, SARI);
  const calls = watchApi(shell.page);

  meRoute.answer(503, UNAVAILABLE);
  await signedInButUnread(shell.page, meRoute);

  return { ...shell, meRoute, calls };
};

/** No retry timer is left to fire and nothing is in flight: what was sent is everything that will be. */
const settle = async (page: Page): Promise<void> => {
  await page.clock.runFor(TOAST_MS);
  await page.waitForLoadState('networkidle');
};

const draftKeys = (page: Page) =>
  page.evaluate(() =>
    Object.keys(sessionStorage).filter((key) => key.startsWith('treecord:draft:')),
  );

test('SH-AC1: a signed-out visitor on /carbon sees "Carbon credits" current, "Sign in" and no workspace sidebar', async ({
  browser,
}) => {
  const { page, conditions, context } = await openShell(browser);

  await page.goto('/carbon');
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Carbon credits' }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.locator(SIDEBAR)).toHaveCount(0);
  expectNoBlocked(conditions);
  await context.close();
});

test('SH-AC2: Sari on /campaigns has the account menu and the Planter sidebar, not the public nav', async ({
  browser,
}) => {
  const { page, conditions } = await sessionAs(browser, SARI, { path: '/campaigns' });

  await expect(accountMenu(page)).toBeVisible();
  await expect(page.locator('nav[aria-label="Main navigation"]')).toHaveCount(0);
  await expect(page.locator(`${SIDEBAR} .workspace-label`)).toHaveText('PLANTER WORKSPACE');
  await expect(page.locator(`${SIDEBAR} nav a`)).toHaveText([
    'My trees',
    'Slots',
    'Campaigns',
    'Challenges',
    'Uploads',
  ]);
  await expect(page.locator(CURRENT_ITEM)).toHaveText('Campaigns');
  expectNoBlocked(conditions);
});

test('SH-AC3: activating "Skip to content" from the keyboard focuses #main-content', async ({
  browser,
}) => {
  const { page, conditions, context } = await openShell(browser);

  for (const path of ['/sign-in', '/nowhere']) {
    await page.goto(path);
    const skip = page.getByRole('link', { name: 'Skip to content' });

    await skip.waitFor();
    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('main-content');
  }

  expectNoBlocked(conditions);
  await context.close();
});

test('SH-AC4: Sari opens the account menu: name, short wallet, Profile, This device, Sign out', async ({
  browser,
}) => {
  const { page, conditions } = await sessionAs(browser, SARI, { path: '/app/planter/trees' });

  await openMenu(page);
  await expect(page.locator('.account-pop-head strong')).toHaveText('Sari');
  await expect(page.locator('.account-pop-head small')).toHaveText('0x4b9e…9d0e');
  await expect(page.getByRole('menuitem')).toHaveText(['Profile', 'This device', 'Sign out']);
  expectNoBlocked(conditions);
});

test('SH-AC5: Alex the donor sees Profile and Sign out only, no "This device"', async ({
  browser,
}) => {
  const { page, conditions } = await sessionAs(browser, ALEX, { path: '/app/donor' });

  await openMenu(page, 'Account: Alex, Donor');
  await expect(page.getByRole('menuitem')).toHaveText(['Profile', 'Sign out']);
  await expect(page.getByRole('menuitem', { name: 'This device' })).toHaveCount(0);
  expectNoBlocked(conditions);
});

test('SH-AC6: Escape, "Profile" and a click on the page each close the open account menu', async ({
  browser,
}) => {
  const { page, conditions } = await sessionAs(browser, SARI, { path: '/app/planter/trees' });

  await openMenu(page);
  await page.keyboard.press('Escape');
  await expect(menuDetails(page)).not.toHaveAttribute('open', '');
  await openMenu(page);
  await page.getByRole('menuitem', { name: 'Profile' }).click();
  await expect(page).toHaveURL(/\/app\/profile$/);
  await expect(menuDetails(page)).not.toHaveAttribute('open', '');
  await openMenu(page);
  await page.locator('main').click({ position: { x: 4, y: 4 } });
  await expect(menuDetails(page)).not.toHaveAttribute('open', '');
  expectNoBlocked(conditions);
});

test('SH-AC7: with no display name the popover says "Donor" and the name element is the email local part', async ({
  browser,
}) => {
  const { page, conditions } = await sessionAs(browser, FIRST_SIGN_IN, { path: '/app/donor' });

  await menuDetails(page).locator('summary').click();
  await expect(page.locator('.account-pop-head small')).toHaveText('Donor');
  // shell.md SH-4 (COPY-100 retired) and SI-AC18 say the email local part; SH-AC7 still names COPY-100: see the report
  await expect(page.getByTestId('account-name')).toHaveText(testLogin().email.split('@')[0] ?? '');
  expectNoBlocked(conditions);
});

test('SH-AC8: Alex on a campaign report has "Campaigns" current in the sidebar', async ({
  browser,
}) => {
  const { page, conditions } = await sessionAs(browser, ALEX, { path: REPORT });

  await expect(page).toHaveURL(new RegExp(`${REPORT}$`));
  await expect(page.locator(CURRENT_ITEM)).toHaveText('Campaigns');
  expectNoBlocked(conditions);
});

test('SH-AC9: no sidebar on /app/planter/record, the sidebar is back on /app/planter/trees', async ({
  browser,
}) => {
  const { page, conditions } = await sessionAs(browser, SARI, {
    path: '/app/planter/record?tree=3001&kind=ALIVE',
  });

  await expect(accountMenu(page)).toBeVisible();
  await expect(page.locator(SIDEBAR)).toHaveCount(0);
  await visit(page, '/app/planter/trees');
  await expect(page.locator(SIDEBAR)).toBeVisible();
  expectNoBlocked(conditions);
});

test('SH-AC10: /app for an Auditor replaces itself with /app/audit without growing the history', async ({
  browser,
}) => {
  const { page, conditions } = await sessionAs(browser, DEWI, { path: '/campaigns' });
  const before = await page.evaluate(() => history.length);

  await visit(page, '/app');
  await expect(page).toHaveURL(/\/app\/audit$/);
  // opening /app is one new entry (the push above); the redirect is a replace, so it adds none
  expect(await page.evaluate(() => history.length)).toBe(before + 1);
  expectNoBlocked(conditions);
});

test('SH-AC11: while GET /me is pending, /app shows "Loading workspace…" and stays on /app', async ({
  browser,
}) => {
  const { page, conditions, context } = await openShell(browser);
  const meRoute = await controlMe(page, SARI);
  const release = meRoute.hold();

  await signedInButUnread(page, meRoute);
  await visit(page, '/app');
  await expect(page.locator('[role="status"][aria-busy="true"]')).toContainText(
    'Loading workspace…',
  );
  await expect(page).toHaveURL(/\/app$/);
  release();
  await expect(page).toHaveURL(/\/app\/planter\/trees$/);
  expectNoBlocked(conditions);
  await context.close();
});

test('SH-AC12: "/" lands on /landing/, and "/#/campaigns" lands on /campaigns', async ({
  browser,
}) => {
  const { page, conditions, context } = await openShell(browser);

  await page.goto('/');
  await expect(page).toHaveURL(/\/landing\/$/);
  await page.goto('/#/campaigns');
  await expect(page).toHaveURL(/\/campaigns$/);
  expectNoBlocked(conditions);
  await context.close();
});

test('SH-AC13: signed out, /app/profile goes to /sign-in?returnTo=%2Fapp%2Fprofile without asking /me', async ({
  browser,
}) => {
  const { page, conditions, context } = await openShell(browser);
  const calls = watchApi(page);

  await page.goto('/app/profile');
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fapp%2Fprofile$/);
  await expect(
    page.getByText(
      'We’ll send a six-digit code to your email. Afterwards you’ll return to your profile.',
    ),
  ).toBeVisible();
  expect(calls).toEqual([]);
  expectNoBlocked(conditions);
  await context.close();
});

test('SH-AC14: a private read answering 401 invalid_token goes to /sign-in?returnTo= once, unrepeated', async ({
  browser,
}) => {
  const {
    page,
    conditions,
    me: meRoute,
  } = await sessionAs(browser, SARI, { path: '/app/planter/trees' });
  const sent = meRoute.count();

  meRoute.answer(401, INVALID_TOKEN);
  await refocus(page);
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fapp%2Fplanter%2Ftrees$/);
  await settle(page);
  expect(meRoute.count() - sent).toBe(1);
  sessionEnded();
  expectNoBlocked(conditions);
});

test('SH-AC15: a Donor on an operator page sees "Role unavailable" and the page sends no request', async ({
  browser,
}) => {
  const { page, conditions } = await sessionAs(browser, ALEX, { path: '/app/donor' });
  const calls = watchApi(page);

  await visit(page, OPERATOR_PAGE);
  await expect(page.getByRole('heading', { name: 'Role unavailable' })).toBeVisible();
  await expect(page.getByText('This screen is for Operator accounts.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
  expect(calls.filter((call) => call !== 'GET /api/v1/me')).toEqual([]);
  expectNoBlocked(conditions);
});

test('SH-AC16: going offline on /app/profile shows the callout and disables "Save profile" and "Copy wallet"', async ({
  browser,
}) => {
  const { page, conditions, context } = await sessionAs(browser, SARI, { path: '/app/profile' });

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await standInControls(page, ['Save profile', 'Copy wallet']);
  await expect(page.getByRole('button', { name: 'Save profile' })).toBeEnabled();
  await context.setOffline(true);
  await expect(
    page.getByText('Offline · showing saved data. Network actions are unavailable.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save profile' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Copy wallet' })).toBeDisabled();
  await context.setOffline(false);
  expectNoBlocked(conditions);
});

test('SH-AC17: a 503 read shows "Could not load this page"; "Try again" sends one more GET and no POST', async ({
  browser,
}) => {
  const { page, conditions, context, meRoute, calls } = await unreadSession(browser);

  await visit(page, '/app/planter/trees');
  const tryAgain = page.getByRole('button', { name: 'Try again' });

  // S02 shows an alert of its own on the way here; the page's block is the one with "Try again"
  await expect(tryAgain).toBeVisible({ timeout: SLOW });
  const block = page.getByRole('alert').filter({ has: tryAgain });

  await expect(block).toContainText('Could not load this page');
  await expect(block).toContainText('Your inputs and local records are unchanged.');
  const sent = calls.length;

  meRoute.answer(200, meBody(SARI));
  await tryAgain.click();
  await expect(accountMenu(page)).toBeVisible();
  await settle(page);
  expect(calls.slice(sent)).toEqual(['GET /api/v1/me']);
  expectNoBlocked(conditions);
  await context.close();
});

test('SH-AC18: /app/nope shows "Page not found" and the title "Not found · Treecord"', async ({
  browser,
}) => {
  const { page, conditions } = await sessionAs(browser, SARI, { path: '/app/nope' });

  await expect(page.getByText('Page not found')).toBeVisible();
  await expect(page).toHaveTitle('Not found · Treecord');
  expectNoBlocked(conditions);
});

test('SH-AC19: "Sign out" on /app/planter/trees goes to /campaigns, clears the drafts and toasts "Signed out"', async ({
  browser,
}) => {
  const { page, conditions } = await sessionAs(browser, SARI, { path: '/app/planter/trees' });

  await page.evaluate((key) => sessionStorage.setItem(key, '{}'), DRAFT);
  await signOut(page);
  await expect(page).toHaveURL(/\/campaigns$/);
  await expect(page.locator(SIDEBAR)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.locator('.toast-area')).toContainText(SIGNED_OUT);
  expect(await draftKeys(page)).toEqual([]);
  expectNoBlocked(conditions);
});

test('SH-AC20: "Sign out" on a public page keeps the URL, drops the sidebar and toasts "Signed out"', async ({
  browser,
}) => {
  const { page, conditions } = await sessionAs(browser, ALEX, { path: '/carbon' });

  await signOut(page);
  await expect(page.locator(SIDEBAR)).toHaveCount(0);
  await expect(page.locator('.toast-area')).toContainText(SIGNED_OUT);
  await expect(page).toHaveURL(/\/carbon$/);
  expectNoBlocked(conditions);
});

test('SH-AC21: pausing motion shows "Play motion", sets motion-paused and the stored choice, before and after a reload', async ({
  browser,
}) => {
  const { page, conditions, context } = await openShell(browser, { motion: true });
  const toggle = (label: string) => page.getByRole('button', { name: label });
  const stored = () => page.evaluate(() => localStorage.getItem('treecord-motion'));

  await page.goto('/campaigns');
  await expect(toggle('Pause motion')).toHaveAttribute('aria-pressed', 'false');
  await toggle('Pause motion').click();

  for (const phase of ['before', 'after']) {
    await expect(toggle('Play motion'), phase).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.app')).toHaveClass(/motion-paused/);
    expect(await stored(), phase).toBe('paused');
    await page.reload();
  }

  expectNoBlocked(conditions);
  await context.close();
});

test('SH-AC22: with reduced motion emulated the toggle is disabled and says so', async ({
  browser,
}) => {
  const { page, conditions, context } = await openShell(browser, { motion: true });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/campaigns');
  const toggle = page.getByRole('button', { name: 'Reduced motion enabled by your system' });

  await expect(toggle).toBeDisabled();
  await expect(toggle).toHaveAttribute('title', 'System reduced motion');
  expectNoBlocked(conditions);
  await context.close();
});

test('SH-AC23: the "Signed out" toast goes after 4 s, or when dismissed, and never takes focus', async ({
  browser,
}) => {
  for (const how of ['after 4 s', 'dismissed']) {
    const { page, conditions } = await sessionAs(browser, SARI, { path: '/app/planter/trees' });
    const toast = page.locator('.toast-area .toast');

    await signOut(page);
    await expect(toast, how).toContainText(SIGNED_OUT);
    expect(
      await page.evaluate(() => document.activeElement?.closest('.toast-area') ?? null),
      how,
    ).toBeNull();

    if (how === 'dismissed') {
      await page.getByRole('button', { name: 'Dismiss toast' }).click();
    } else {
      await page.clock.fastForward(TOAST_MS);
    }

    await expect(toast, how).toHaveCount(0);
    expectNoBlocked(conditions);
  }
});

test('SH-AC24: /app/profile has the title "Profile · Treecord" and the footer "© 2026 Treecord"', async ({
  browser,
}) => {
  const { page, conditions } = await sessionAs(browser, SARI, { path: '/app/profile' });

  await expect(page).toHaveTitle('Profile · Treecord');
  await expect(page.getByRole('contentinfo')).toContainText('© 2026 Treecord');
  expectNoBlocked(conditions);
});

test("SH-AC25: after Sari signs out and Alex signs in, nothing keyed with Sari's profile id is read", async ({
  browser,
}) => {
  const { page, conditions } = await sessionAs(browser, SARI, { path: '/app/planter/trees' });
  const seen: string[] = [];

  await page.evaluate((key) => sessionStorage.setItem(key, '{}'), DRAFT);
  await signOut(page);
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  page.on('request', (request) => {
    seen.push(request.url(), request.postData() ?? '', JSON.stringify(request.headers()));
  });
  await signInAgain(ALEX);
  await page.locator(`${SIDEBAR} nav`).getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL(/\/app\/donor$/);
  await expect(accountMenu(page, 'Account: Alex, Donor')).toBeVisible();
  const stores = await page.evaluate(() => [
    ...Object.entries(sessionStorage).flat(),
    ...Object.entries(localStorage).flat(),
  ]);

  expect([...seen, ...stores].filter((text) => text.includes(SARI.id))).toEqual([]);
  expectNoBlocked(conditions);
});

test('SH-AC26: the header progress follows the scroll to 4 decimals and goes compact past the heading', async ({
  browser,
}) => {
  const { page, conditions, context } = await openShell(browser);
  const header = page.getByRole('banner');

  await page.goto('/campaigns');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await standInTallPage(page);
  const frame = () =>
    page.evaluate(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const heading = document.querySelector<HTMLElement>('.page-heading');
      const bottom = (heading?.offsetTop ?? 0) + (heading?.offsetHeight ?? 0);

      return {
        bar: document.querySelector('header')?.style.getPropertyValue('--progress'),
        expected: Math.min(1, window.scrollY / max).toFixed(4),
        past: window.scrollY > bottom - 64,
      };
    });
  const scrollTo = (fraction: number) =>
    page.evaluate((share) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;

      window.scrollTo({ top: Math.round(max * share), behavior: 'instant' });
    }, fraction);

  // down to the bottom in steps, then back to the top
  for (const fraction of [0.02, 0.1, 0.35, 0.6, 0.85, 1, 0.5, 0.05, 0]) {
    await scrollTo(fraction);
    await expect
      .poll(async () => (await frame()).bar, { message: `at ${fraction}` })
      .toBe((await frame()).expected);
    await expect(header).toHaveClass((await frame()).past ? /header--compact/ : /^header$/);
  }

  await expect(header).not.toHaveClass(/header--compact/);
  expect((await frame()).bar).toBe('0.0000');
  expectNoBlocked(conditions);
  await context.close();
});

test('SH-AC27: on a phone, "Uploads" opens /app/planter/uploads and the tab row scrolls it fully into view', async ({
  browser,
}) => {
  const { page, conditions } = await sessionAs(browser, SARI, {
    viewport: PHONE,
    path: '/app/planter/trees',
  });
  const uploads = page.locator(`${SIDEBAR} nav`).getByRole('link', { name: 'Uploads' });

  // dispatching the click does not scroll the row for the visitor: the app has to
  await uploads.dispatchEvent('click');
  await expect(page).toHaveURL(/\/app\/planter\/uploads$/);
  await expect(uploads).toHaveAttribute('aria-current', 'page');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const tab = document.querySelector('aside[aria-label$="workspace"] nav a[aria-current]');
        const row = document.querySelector('aside[aria-label$="workspace"] nav');
        const [inner, outer] = [tab?.getBoundingClientRect(), row?.getBoundingClientRect()];

        return Boolean(inner && outer && inner.left >= outer.left && inner.right <= outer.right);
      }),
    )
    .toBe(true);
  expectNoBlocked(conditions);
});
