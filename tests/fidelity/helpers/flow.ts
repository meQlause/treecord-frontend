// Shared plumbing of the browser flow specs (s02-sign-in.flow.spec.ts, states.spec.ts): a `test` that opens contexts
// under the docs/FE/fidelity.md §2 conditions and checks them at the end, the Privy provider answers a spec can
// script, and the few page-level moves that need the real router (the app keeps no login across a reload, D-7).
import { test as base, type Page, type Request, type Route } from '@playwright/test';
import {
  applyConditions,
  contextOptions,
  expectNoBlocked,
  type Conditions,
  type Viewport,
} from '../fidelity.setup';
import { MATRIX, VIEWPORTS } from '../matrix';
import { meBody, type MeProfile } from '../fixtures/accounts';
import { PRIVY_HOSTS, answerMe, testLogin } from './privy';

export type Opened = { page: Page; conditions: Conditions };

export type OpenOptions = { row?: string; viewport?: Viewport };

export const test = base.extend<{ open: (options?: OpenOptions) => Promise<Opened> }>({
  open: async ({ browser }, provide) => {
    const opened: Opened[] = [];
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];

    await provide(async ({ row = 'S02', viewport = VIEWPORTS[0] } = {}) => {
      const matrixRow = MATRIX.find((candidate) => candidate.id === row) ?? MATRIX[0]!;
      const context = await browser.newContext(contextOptions(matrixRow, viewport));
      const conditions = await applyConditions(context, matrixRow, PRIVY_HOSTS);
      const page = await context.newPage();

      contexts.push(context);
      opened.push({ page, conditions });

      return { page, conditions };
    });
    await Promise.all(contexts.map((context) => context.close()));
    opened.forEach(({ conditions }) => expectNoBlocked(conditions));
  },
});

export { expect } from '@playwright/test';

// ---- the Privy provider, scripted (s02-sign-in.md §7: "routing the SDK's verify call") ----

const PRIVY_INIT = '**/api/v1/passwordless/init';
const PRIVY_VERIFY = '**/api/v1/passwordless/authenticate';
const UNPROCESSABLE = 422;
const HTTP_OK = 200;
const ME_ROUTE = '**/api/v1/me';
const NO_CONTENT = 204;
const TOO_MANY_REQUESTS_STATUS = 429;

/** What Privy answers for a wrong code, captured from the real service on 24 Oct 2026. */
const WRONG_CODE = { error: 'Invalid email and code combination', code: 'invalid_credentials' };

/**
 * An expired code. ponytail: the service gives no live way to produce one (the test account's code never expires, and
 * the SDK itself folds "wrong" and "expired" into `invalid_credentials`), so this body is the wording `signInOutcome`
 * looks for, not a captured answer.
 */
const EXPIRED_CODE = { error: 'Verification code has expired', code: 'code_expired' };

/** What Privy answered when one account verified too often, captured live on 24 Oct 2026. */
const RATE_LIMITED = {
  error: 'Too many requests. Please wait to try again.',
  code: 'too_many_requests',
};

export type Verdict = 'invalid' | 'expired' | 'unreachable' | 'limited';

const fulfillPrivy = (status: number, body: unknown) => async (route: Route) => {
  const request = route.request();
  const headers = {
    'Access-Control-Allow-Origin': request.headers().origin ?? '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] ?? '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  };

  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: NO_CONTENT, headers });

    return;
  }

  await route.fulfill({
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
};

/** "Send code" succeeds without Privy mailing anyone. */
const privySends = async (page: Page): Promise<void> => {
  await page.route(PRIVY_INIT, fulfillPrivy(HTTP_OK, { success: true }));
};

/** "Verify" is answered as `verdict` says. */
export const privyVerdict = async (page: Page, verdict: Verdict): Promise<void> => {
  if (verdict === 'unreachable') {
    await page.route(PRIVY_VERIFY, (route) => route.abort());

    return;
  }

  const answers = {
    invalid: fulfillPrivy(UNPROCESSABLE, WRONG_CODE),
    expired: fulfillPrivy(UNPROCESSABLE, EXPIRED_CODE),
    limited: fulfillPrivy(TOO_MANY_REQUESTS_STATUS, RATE_LIMITED),
  };

  await page.route(PRIVY_VERIFY, answers[verdict]);
};

// ---- counting requests ----

const QUIET_MS = 2500;

/** Lets a request that must NOT happen have its chance: the one place the specs wait for nothing to arrive. */
export const settle = (page: Page, duration = QUIET_MS): Promise<void> =>
  page.waitForTimeout(duration);

/** Every request whose URL matches `pattern`, from now on. */
export const requestsTo = (page: Page, pattern: RegExp): Request[] => {
  const seen: Request[] = [];

  page.on('request', (request) => {
    if (pattern.test(request.url())) {
      seen.push(request);
    }
  });

  return seen;
};

export const VERIFY_CALL = /passwordless\/authenticate/;

/** Our own API (the API at VITE_API_URL), not Privy's. */
export const OWN_API = /localhost:4000\/api\/v1\//;

export const ME_CALL = /localhost:4000\/api\/v1\/me$/;

// ---- the S02 form ----

export const SARI_EMAIL = 'sari@example.com';

/** Types `email` and sends the code (answered by `privySends`); ends on the Code step. */
export const toCodeStep = async (page: Page, email = SARI_EMAIL, returnTo = ''): Promise<void> => {
  await privySends(page);
  const query = returnTo === '' ? '' : `?returnTo=${encodeURIComponent(returnTo)}`;

  await page.goto(`/sign-in${query}`);
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByLabel('Verification code').waitFor();
};

// ---- moves inside the running app ----

/**
 * Opens `path` through the router without reloading, the way a link does. A reload would end the login (the app keeps
 * none), so every signed-in spec moves this way once it is signed in.
 */
export const goInApp = (page: Page, path: string): Promise<void> =>
  page.evaluate((to) => {
    window.history.pushState({}, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);

/** What TanStack Query does when the person comes back to the tab: every stale read runs again. */
export const refocus = (page: Page): Promise<void> =>
  page.evaluate(() => {
    window.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });

// ---- signing in with the real Privy test account ----

// Privy lets one account verify about five times a minute and then answers 429 `too_many_requests` (measured live,
// 24 Oct 2026), and another spec may be signing in at the same time: space our logins and wait out a 429.
const LOGIN_GAP_MS = 12_000;
const RATE_LIMIT_WAIT_MS = 15_000;
const MAX_ATTEMPTS = 8;
let lastLogin = 0;

const spaceLogins = async (page: Page): Promise<void> => {
  const wait = lastLogin + LOGIN_GAP_MS - Date.now();

  if (wait > 0) {
    await page.waitForTimeout(wait);
  }

  lastLogin = Date.now();
};

const verifyUntilAnswered = async (page: Page): Promise<void> => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const answered = page.waitForResponse(
      (response) => VERIFY_CALL.test(response.url()) && response.request().method() === 'POST',
    );

    await page.getByRole('button', { name: 'Verify' }).click();

    if ((await answered).status() !== TOO_MANY_REQUESTS_STATUS) {
      return;
    }

    await page.waitForTimeout(RATE_LIMIT_WAIT_MS);
  }
};

type SignInOptions = {
  status?: number;
  returnTo?: string;
  /** Runs once `/me` is answered, before the form opens: a spec re-routes `/me` here (a later route wins). */
  setup?: (page: Page) => Promise<void>;
};

/**
 * The real sign-in form with the Privy test account (backend/.env); `GET /me` answers `body` with `status`. Ends right
 * after "Verify" is answered, whatever the outcome, so a spec asserts what it expects next.
 */
export const signInWith = async (
  page: Page,
  body: unknown,
  { status = HTTP_OK, returnTo = '/app', setup }: SignInOptions = {},
): Promise<void> => {
  const { email, code } = testLogin();

  await spaceLogins(page);
  await answerMe(page, body, status);
  await setup?.(page);
  await page.goto(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByLabel('Verification code').fill(code);
  await verifyUntilAnswered(page);
};

/** The e-mail the Privy session carries: what the Ready line and the account menu print. */
export const sessionEmail = (): string => testLogin().email;

/**
 * Holds `GET /me` until `gate` settles, then lets the answer registered before it (`answerMe`) go out. A gate that never
 * settles is a request that hangs.
 */
export const holdMe = async (page: Page, gate: Promise<unknown>): Promise<void> => {
  await page.route(ME_ROUTE, async (route) => {
    if (route.request().method() === 'GET') {
      await gate;
    }

    await route.fallback();
  });
};

/** Signs in as `profile` and presses "Continue" on the Ready step: the person is inside the app, at `path`. */
export const signedInAt = async (page: Page, profile: MeProfile, path: string): Promise<void> => {
  await signInWith(page, meBody(profile), { returnTo: path });
  await page.getByRole('button', { name: /^Continue to/ }).click();
  await page.waitForURL(`**${path}`);
};
