// Helpers of tests/fidelity/shell.flow.spec.ts (docs/FE/features/shell.md §7): contexts under the fidelity.md §2
// conditions, a signed-in session made once through the real Privy form and reused, and a controllable `GET /me`.
import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { applyConditions, contextOptions, type Conditions, type Viewport } from '../fidelity.setup';
import { SARI, meBody, type MeProfile } from '../fixtures/accounts';
import { VIEWPORTS } from '../matrix';
import { PRIVY_HOSTS, testLogin } from './privy';

export const PHONE = VIEWPORTS[0];

const WIDE = VIEWPORTS[1];

const SHELL_ROW = { id: 'Shell' };
const ORIGIN = 'http://127.0.0.1:5173';
const SIGNED_IN_TIMEOUT = 30_000;
const LOOPBACK = new Set(['127.0.0.1', 'localhost']);

const CORS = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Headers': 'authorization,content-type,idempotency-key',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Expose-Headers': 'X-Request-Id',
};

export type Shell = { context: BrowserContext; page: Page; conditions: Conditions };

type OpenOptions = {
  viewport?: Viewport;
  /** The motion specs (SH-AC21, SH-AC22) must not force `reduce`. */
  motion?: boolean;
};

export const openShell = async (
  browser: Browser,
  { viewport = WIDE, motion = false }: OpenOptions = {},
): Promise<Shell> => {
  const context = await browser.newContext({
    ...contextOptions(SHELL_ROW, viewport),
    ...(motion ? { reducedMotion: 'no-preference' as const } : {}),
  });
  const conditions = await applyConditions(context, SHELL_ROW, PRIVY_HOSTS);

  return { context, page: await context.newPage(), conditions };
};

/** A `GET /me` the test steers: the answer can change, and a request can be held until released. */
export type Me = {
  /** Every GET that reached the route. */
  count: () => number;
  answer: (status: number, body: unknown) => void;
  hold: () => () => void;
};

export const controlMe = async (page: Page, profile: MeProfile): Promise<Me> => {
  let reply = { status: 200, body: meBody(profile) as unknown };
  let gate: Promise<void> | null = null;
  let gets = 0;

  await page.route('**/api/v1/me', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });

      return;
    }

    gets += 1;
    await gate;
    await route.fulfill({
      status: reply.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify(reply.body),
    });
  });

  return {
    count: () => gets,
    answer: (status, body) => {
      reply = { status, body };
    },
    hold: () => {
      let release = (): void => undefined;

      gate = new Promise<void>((resolve) => {
        release = resolve;
      });

      return () => {
        release();
        gate = null;
      };
    },
  };
};

/** Every call the page makes to the API, as `GET /api/v1/me`, in order (the CORS preflight is not one). */
export const watchApi = (page: Page): string[] => {
  const calls: string[] = [];

  page.on('request', (request) => {
    const { hostname, pathname } = new URL(request.url());

    // the app's own API; Privy has an /api/v1/ of its own
    if (
      LOOPBACK.has(hostname) &&
      pathname.startsWith('/api/v1/') &&
      request.method() !== 'OPTIONS'
    ) {
      calls.push(`${request.method()} ${pathname}`);
    }
  });

  return calls;
};

/** The S02 form with the Privy test account (s02-sign-in.md §7), from the email step to the Verify press. */
export const submitSignInForm = async (page: Page): Promise<void> => {
  const { email, code } = testLogin();

  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByLabel('Code').fill(code);
  await page.getByRole('button', { name: 'Verify' }).click();
};

const ATTEMPTS = 4;
const BACKOFF = 15_000;

/** The code step: type the fixed code and verify; false when Privy refused it (back at the email step). */
const verifyCode = async (page: Page): Promise<boolean> => {
  const refused = page.locator('#si-error');
  const ready = page.getByText('You’re in.');

  await page.getByLabel('Code').fill(testLogin().code);
  await page.getByRole('button', { name: 'Verify' }).click();
  await ready.or(refused).waitFor({ timeout: SIGNED_IN_TIMEOUT });

  if (await ready.isVisible()) {
    return true;
  }

  await page.getByRole('button', { name: 'Use a different email' }).click();

  return false;
};

/** One pass through the form from the email step; false when Privy refused it (and the form is back at the email step). */
const tryOnce = async (page: Page): Promise<boolean> => {
  const codeField = page.getByLabel('Code');

  await page.getByLabel('Email').fill(testLogin().email);
  await page.getByRole('button', { name: 'Send code' }).click();
  await codeField.or(page.locator('#si-error')).waitFor({ timeout: SIGNED_IN_TIMEOUT });

  return (await codeField.isVisible()) && verifyCode(page);
};

/**
 * Fills the S02 form from the email step and waits for the Ready step. Privy answers 429 when the test account signs
 * in too often (this spec signs in several times, and other specs share the account): the form is then filled in again
 * after a pause.
 */
const completeSignIn = async (page: Page): Promise<void> => {
  const refusals: string[] = [];

  page.on('response', (response) => {
    if (response.url().includes('privy.io/api/') && response.status() >= 400) {
      refusals.push(`${response.status()} ${new URL(response.url()).pathname}`);
    }
  });

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    if (await tryOnce(page)) {
      return;
    }

    await page.waitForTimeout(BACKOFF * attempt);
  }

  throw new Error(`Privy refused the test login ${ATTEMPTS} times: ${refusals.join(', ')}`);
};

/** Signs in on /sign-in?returnTo= and waits for the Ready step. */
const signInThroughForm = async (page: Page, returnTo = '/app'): Promise<void> => {
  await page.goto(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  await completeSignIn(page);
};

/** "Continue to …" on the Ready step: a client-side navigation to `returnTo`, so the Privy session survives. */
const continueToTarget = (page: Page): Promise<void> =>
  page.getByRole('button', { name: /^Continue to/ }).click();

/** Opens `path` inside the running app without a reload (what following a link does). */
export const visit = (page: Page, path: string): Promise<void> =>
  page.evaluate((target) => {
    const idx = ((history.state as { idx?: number } | null)?.idx ?? 0) + 1;

    history.pushState({ usr: null, key: `go${idx}`, idx }, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);

/** TanStack Query refetches the active queries when the tab becomes visible again; this is that signal. */
export const refocus = (page: Page): Promise<void> =>
  page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
  });

// ---- the signed-in page the specs share ----
// Privy throttles the test account (429) and a reload forgets the login (D-7, fe-stack.md §1.1), so the specs that only
// need "a signed-in shell" share one page: signed in once through the real form, then moved with `go`, and given the
// profile they need by changing what `GET /me` answers and refocusing. A spec that signs out leaves the page signed
// out; the next one signs in again.
type Shared = Shell & { me: Me; signedIn: boolean };

let shared: Shared | undefined;

export const closeSession = async (): Promise<void> => {
  await shared?.context.close();
  shared = undefined;
};

/** The account menu's `aria-label` for `profile` (SH-4: no display name shows the sign-in email's local part). */
const menuLabel = (profile: MeProfile): string => {
  const name = profile.displayName ?? testLogin().email.split('@')[0];

  return `Account: ${name}, ${profile.role.charAt(0).toUpperCase()}${profile.role.slice(1)}`;
};

type SessionOptions = { path?: string; viewport?: Viewport };

const menuOf = (page: Page, profile: MeProfile) =>
  page.locator(`summary[aria-label="${menuLabel(profile)}"]`);

/** The shared page is signed in: give it `profile` (what `/me` answers) and take it to `path`. */
const switchTo = async (shell: Shared, profile: MeProfile, path: string): Promise<void> => {
  shell.me.answer(200, meBody(profile));
  await refocus(shell.page);
  await expect(menuOf(shell.page, profile)).toBeVisible();
  await visit(shell.page, path);
  // a spec before this one may have left the menu open
  await shell.page.evaluate(() =>
    document.querySelector('details.account-menu')?.removeAttribute('open'),
  );
};

/** The shared page is signed out: sign in through the form, ending on `path` as `profile`. */
const signInFresh = async (shell: Shared, profile: MeProfile, path: string): Promise<void> => {
  // S02 refuses a profile without a wallet (SI-AC8): sign in as Sari and change the answer afterwards
  shell.me.answer(200, meBody(profile.walletAddress === null ? SARI : profile));
  await signInThroughForm(shell.page, path);
  await continueToTarget(shell.page);
  shell.signedIn = true;
  shell.me.answer(200, meBody(profile));
  await refocus(shell.page);
  await expect(menuOf(shell.page, profile)).toBeVisible();
};

/** The shared page, signed in as `profile` and on `path` (inside the app, without a reload). */
export const sessionAs = async (
  browser: Browser,
  profile: MeProfile,
  { path = '/app', viewport = WIDE }: SessionOptions = {},
): Promise<Shared> => {
  if (shared === undefined) {
    const shell = await openShell(browser);

    shared = { ...shell, me: await controlMe(shell.page, SARI), signedIn: false };
  }

  shared.conditions.blocked.length = 0;
  await shared.page.setViewportSize(viewport);
  await (shared.signedIn ? switchTo(shared, profile, path) : signInFresh(shared, profile, path));

  return shared;
};

/** The shared page signs in again from where it is (the header's "Sign in"), as `profile`; ends on `path`. */
export const signInAgain = async (profile: MeProfile): Promise<void> => {
  if (shared === undefined) {
    throw new Error('no shared page: call sessionAs first');
  }

  shared.me.answer(200, meBody(profile));
  await shared.page.getByRole('button', { name: 'Sign in' }).click();
  await completeSignIn(shared.page);
  await continueToTarget(shared.page);
  shared.signedIn = true;
};

/** The shared page lost its Privy session without a sign-out (S02 logs out of a session the API refused, SH-AC14). */
export const sessionEnded = (): void => {
  if (shared) {
    shared.signedIn = false;
  }
};

/** Presses "Sign out" in the account menu of the shared page. */
export const signOut = async (page: Page): Promise<void> => {
  await page.locator('details.account-menu summary').click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();

  if (shared) {
    shared.signedIn = false;
  }
};
