// docs/phases.md F0a: "App-wide UI-gap patterns (FE/ui-gaps.md §2): loading (1), read failure (8), session expired (12),
// forbidden (13), offline (14), timeout (15), error toast (20), time zone (21), dialog modality (23), display name null
// (24) reach their drawn states on the shell rows". One test per pattern, in the real app: no ?state= switch, the
// states are driven by what the network answers (page.route, context.setOffline) and by Playwright's clock.
// D-7: a reload forgets the login, so a signed-in test signs in through the form and then moves only inside the app.
import type { Page } from '@playwright/test';
import { FROZEN_CLOCK } from './fidelity.setup';
import { SARI, meBody, type MeProfile } from './fixtures/accounts';
import { ALEX_VIEWER, DEMAK_DETAIL, DEWI_VIEWER, detail, item } from './fixtures/campaigns';
import { FIRST_PAGE, REPORT, SECOND_PAGE } from './fixtures/report';
import { SARI_3001, TREE_3001, TREE_3091 } from './fixtures/tree';
import {
  campaignPage,
  catalogPage,
  evidenceRows,
  expectNoSideScroll,
  reportPage,
  reportWith,
  styleOf,
  treePage,
  thumbnailPage,
  treeWith,
} from './helpers/gap-pages';
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
import { quietPage } from './helpers/api';
import { answerMe, testLogin } from './helpers/privy';
import { VIEWPORTS } from './matrix';

const TREES = '/app/planter/trees';
// a workspace page with a fixed heading for the shell states: S14 was a stub until F4a; the auditor's S23 is quiet once its reads are answered
const STUB = '/app/audit';
const STUB_HEADING = 'A closer look.';
const LOADING = 'Loading workspace…';
const ERROR_TITLE = 'Could not load this page';
const ERROR_BODY = 'Your inputs and local records are unchanged.';
const OFFLINE = 'Offline · showing saved data. Network actions are unavailable.';
const WALLET = '0x71c7656ec7ab88b098defb751b7401b5f6d8976f';
const ALEX: MeProfile = { ...SARI, role: 'donor', displayName: 'Alex', walletAddress: WALLET };
const NO_NAME: MeProfile = { ...ALEX, displayName: null };
const AUDITOR: MeProfile = { ...ALEX, role: 'auditor' };
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

  await signInWith(page, meBody(AUDITOR), {
    returnTo: STUB,
    setup: async (target) => {
      await holdMe(target, release.promise);
      await quietPage(target);
    },
  });
  await pause(page);
  await goInApp(page, STUB);

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
  await expect(workspace(page).getByRole('heading', { name: STUB_HEADING })).toBeVisible();
});

test('pattern 8 read failure: a 503 on /me shows "Could not load this page" and Try again re-runs only that read', async ({
  open,
}) => {
  const { page } = await open({ row: SHELL });

  await signInWith(page, UNAVAILABLE, { status: HTTP_UNAVAILABLE, returnTo: STUB });
  await expect(page.locator('#si-error')).toContainText(ERROR_TITLE);
  await goInApp(page, STUB);

  const alert = workspace(page).getByRole('alert');

  await expect(alert).toContainText(ERROR_TITLE);
  await expect(alert).toContainText(ERROR_BODY);
  await expect(alert.locator('.error-icon')).toBeVisible();
  await expect(workspace(page).getByText(STUB_HEADING)).toHaveCount(0);

  await answerMe(page, meBody(AUDITOR));
  await quietPage(page);
  const calls = requestsTo(page, OWN_API);

  await alert.getByRole('button', { name: 'Try again' }).click();

  await expect(workspace(page).getByRole('heading', { name: STUB_HEADING })).toBeVisible();
  expect(
    calls
      .map((call) => `${call.method()} ${new URL(call.url()).pathname}`)
      .filter((call) => call.endsWith('/me')),
  ).toEqual(['GET /api/v1/me']);
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

  await signInWith(page, meBody(AUDITOR), {
    returnTo: STUB,
    setup: async (target) => {
      await quietPage(target);
    },
  });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await page.waitForURL(`**${STUB}`);
  const body = workspace(page).locator('fieldset.ws-state-body');

  await expect(workspace(page).getByText(OFFLINE)).toHaveCount(0);
  await page.context().setOffline(true);

  await expect(workspace(page).locator('p.ws-callout')).toHaveText(OFFLINE);
  await expect(body).toHaveJSProperty('disabled', true);
  await expect(workspace(page).getByRole('heading', { name: STUB_HEADING })).toBeVisible();

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

test('pattern 20 error toast: a refused clipboard raises the error toast, polite and dismissible', async ({
  open,
}) => {
  const page = await campaignPage(open, DEMAK_DETAIL);

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) },
    });
  });
  await page.getByTitle('Copy full campaign address').click();

  const toast = page.locator('.toast-error');

  await expect(toast).toBeVisible();
  await expect(page.locator('.toast-area')).toHaveAttribute('aria-live', 'polite');
  await toast.getByRole('button', { name: /dismiss/i }).click();
  await expect(toast).toHaveCount(0);
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

// ---- phases.md F1a: the UI-gap states reached on S03 to S06 (campaigns, campaign, tree, report) ----
// The pages are public and the API is stubbed, so nobody signs in: `viewer` in the answer is what makes a page "signed in".
const WIDE = VIEWPORTS[1];
const PHONE = VIEWPORTS[0];
const TITLE_MAX = 120;
const LONG_WORD = 'W'.repeat(TITLE_MAX);
const LONG_WORDS = 'A very long campaign title that keeps going and going '
  .repeat(3)
  .slice(0, TITLE_MAX);
const LONG_REASON = 'The canopy looks thin on the north side. '.repeat(15);
const UNTITLED = 'Lorem ipsum';
const SECOND_CAMPAIGN = '0x0000000000000000000000000000000000000004';
const CLAMP_LINES = '2';
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const OFFLINE_BODY = 'fieldset.ws-state-body';
const LINE_CLAMP = '-webkit-line-clamp';
const TIMELINE_AT = '2026-07-20T05:00:00.000Z';
const TIMELINE_TX = '0xfc1aa44341c8f43ddcb5395ad09f71054cb5e8c40396b51a98ae4a454b215eed';
const CONTRIBUTE = 'aside.funding-panel .contribute';
const WALLET_COPY = 'Copy full campaign address';
const MORE_ROW = 'evidence-more';
const TREE_LOCATION_NOTE = 'The exact location isn’t public; art is not a location map.';

test('pattern 10 next page S06: the evidence row says "1 of 3", shows Loading… while pending and ends with the rows appended', async ({
  open,
}) => {
  const gate = Promise.withResolvers<void>();
  const page = await reportPage(open, { ...REPORT, evidence: FIRST_PAGE }, WIDE, {
    body: SECOND_PAGE,
    after: gate.promise,
  });
  const more = page.getByTestId(MORE_ROW);
  const rows = evidenceRows(page);

  await expect(rows).toHaveCount(1);
  await expect(page.locator('.load-more')).toContainText('1 of 3');
  await more.click();
  await expect(more).toBeDisabled();
  await expect(more).toHaveAttribute('aria-busy', 'true');
  await expect(more).toContainText('Loading…');

  gate.resolve();
  await expect(rows).toHaveCount(SECOND_PAGE.items.length + FIRST_PAGE.items.length);
  await expect(more).toHaveCount(0);
});

test('pattern 16 long content S03: a 120-character title is clamped to 2 lines and keeps its full text in title', async ({
  open,
}) => {
  const page = await catalogPage(open, [
    item({ title: LONG_WORDS }),
    item({ address: SECOND_CAMPAIGN }),
  ]);
  const heading = page.locator('.campaign-card').first().locator('h2');

  await expect(heading).toHaveAttribute('title', LONG_WORDS);
  await expect(heading).toHaveCSS(LINE_CLAMP, CLAMP_LINES);
  expect(await heading.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
    true,
  );
});

test('pattern 16 long content S04: a 120-character unbroken title wraps in the hero at 360 px, never cut', async ({
  open,
}) => {
  const page = await campaignPage(
    open,
    detail({ title: LONG_WORD, region: { name: LONG_WORD, radiusM: 2500 } }),
    null,
    PHONE,
  );
  const title = page.locator('.detail-hero h1');

  await expect(title).toHaveText(LONG_WORD);
  await expect(title).toHaveClass(/wrap-any/);
  await expect(page.locator('.hero-location')).toHaveText(LONG_WORD);
  await expectNoSideScroll(page, PHONE);
  expect(await title.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test('pattern 16 long content S05: a long title, region and flag reason wrap at 360 px, never cut', async ({
  open,
}) => {
  const [flag] = TREE_3091.flags;
  const page = await treePage(
    open,
    treeWith(
      { title: LONG_WORD, region: { name: LONG_WORD } },
      { flags: [{ ...flag, reasonText: LONG_REASON }] },
    ),
    PHONE,
  );

  await expect(page.locator('.tr-hero h2')).toHaveText(LONG_WORD);
  await expect(page.locator('.tr-hero .location')).toHaveText(LONG_WORD);
  await expect(page.locator('section.ws-panel').filter({ hasText: 'Flags' })).toContainText(
    LONG_REASON.trim(),
  );
  await expectNoSideScroll(page, PHONE);
});

test('pattern 16 long content S06: a long title and "{region} · {species}" line wrap at 360 px, never cut', async ({
  open,
}) => {
  const page = await reportPage(
    open,
    reportWith({ title: LONG_WORD, region: { name: LONG_WORD, radiusM: 2500 } }),
    PHONE,
  );

  await expect(page.locator('.rp-heading h1')).toHaveText(LONG_WORD);
  await expect(page.locator('.rp-heading p')).toContainText(`${LONG_WORD} · Mahogany`);
  await expectNoSideScroll(page, PHONE);
});

test('pattern 17 null value S03: an untitled card shows the placeholder in the same link, styled like a title', async ({
  open,
}) => {
  const page = await catalogPage(open, [
    item({ title: null }),
    item({ title: 'A real title', address: SECOND_CAMPAIGN }),
  ]);
  const links = page.getByTestId('campaign-title');

  await expect(links.nth(0)).toHaveText(UNTITLED);
  await expect(links.nth(0)).toHaveAttribute('href', /\/campaigns\/0x/);
  expect(await styleOf(links.nth(0))).toBe(await styleOf(links.nth(1)));
});

test('pattern 17 null value S04: an untitled campaign puts the placeholder in the h1 and the document title', async ({
  open,
}) => {
  const page = await campaignPage(open, detail({ title: null }));
  const title = page.locator('.detail-hero h1');

  await expect(title).toHaveText(UNTITLED);
  await expect(title).toHaveCSS('font-style', 'normal');
  await expect(page).toHaveTitle(/^Lorem ipsum/);
});

test('pattern 17 null value S05: an untitled campaign and the three unlabelled timeline rows show their placeholders', async ({
  open,
}) => {
  const timeline = ['check_in', 'replanted', 'flag_resolved'].map((kind) => ({
    kind,
    at: TIMELINE_AT,
    txHash: TIMELINE_TX,
    evidenceHash: null,
    evidence: null,
  }));
  const page = await treePage(open, treeWith({ title: null }, { timeline }));
  const titles = page.locator('.ws-timeline h3');

  await expect(page.locator('.tr-hero h2 [data-copy="COPY-157"]')).toHaveText(UNTITLED);
  await expect(titles).toHaveCount(timeline.length);

  for (const [index, id] of ['COPY-176', 'COPY-159', 'COPY-160'].entries()) {
    await expect(titles.nth(index).locator(`[data-copy="${id}"]`)).toHaveText(UNTITLED);
  }
});

test('pattern 17 null value S06: an untitled campaign and the died, replanted and month-less check-in rows show placeholders', async ({
  open,
}) => {
  const [first] = REPORT.evidence.items;
  const items = [
    { ...first, kind: 'died' },
    { ...first, kind: 'replanted', treeId: '3002' },
    { ...first, kind: 'check_in', month: null, treeId: '3003' },
  ];
  const page = await reportPage(
    open,
    reportWith({ title: null }, { evidence: { items, nextCursor: null, total: items.length } }),
  );
  const labels = evidenceRows(page).locator('td:nth-child(2)');

  await expect(page.locator('.rp-heading h1 [data-copy="COPY-157"]')).toHaveText(UNTITLED);

  for (const [index, id] of ['COPY-169', 'COPY-170', 'COPY-171'].entries()) {
    await expect(labels.nth(index).locator(`[data-copy="${id}"]`)).toHaveText(UNTITLED);
  }
});

test('pattern 18 viewport S04 P-13: at 360 px the contribute button sits in normal flow under the amount chips, no sticky bar', async ({
  open,
}) => {
  const page = await campaignPage(open, DEMAK_DETAIL, ALEX_VIEWER, PHONE);
  const side = page.locator('aside.funding-panel');
  const chips = await side.getByRole('group', { name: 'Amount' }).boundingBox();
  const button = page.locator(CONTRIBUTE);
  const box = await button.boundingBox();

  await expectNoSideScroll(page, PHONE);
  expect(box!.y).toBeGreaterThanOrEqual(chips!.y + chips!.height);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(PHONE.width);

  for (const target of [button, side]) {
    await expect(target).not.toHaveCSS('position', 'fixed');
    await expect(target).not.toHaveCSS('position', 'sticky');
  }
});

test('pattern 28 estimate method S06: "{label} · {model}" is the first note under the estimate, the units note follows', async ({
  open,
}) => {
  const estimate = { ...REPORT.carbon.estimate, method: { model: 'linear-maturity-v1' } };
  const page = await reportPage(open, { ...REPORT, carbon: { ...REPORT.carbon, estimate } });
  const notes = page.locator('.rp-carbon > div').first().locator('.rp-note');

  await expect(notes.nth(0)).toHaveText('Lorem ipsum · linear-maturity-v1');
  await expect(notes.nth(1)).toContainText('Estimates are not issued credits.');
});

test('pattern 30 location precision S05: exact shows 6 decimals, approximate shows the cell centre with 3, the note stays', async ({
  open,
}) => {
  const exact = await treePage(open, SARI_3001);
  const approximate = await treePage(open, TREE_3001);
  const location = (page: Page) =>
    page.locator('.tr-panel .ws-facts > div').filter({ hasText: 'Location' }).locator('dd');

  await expect(location(exact)).toHaveText('-7.431205, 109.247813');
  await expect(location(approximate)).toHaveText('-7.432, 109.247 · Approximate');

  for (const page of [exact, approximate]) {
    await expect(page.locator('.cb-buy-note')).toContainText(TREE_LOCATION_NOTE);
  }
});

test('pattern 31 timeline evidence S05: a row shows its thumbnail, score, short hash and transaction link; a failed thumbnail goes, the row stays', async ({
  open,
}) => {
  const loaded = await thumbnailPage(open, (route) =>
    route.fulfill({ contentType: 'image/png', body: PIXEL }),
  );
  const details = loaded.locator('.ws-timeline > li').nth(1).locator('.tl-evidence');

  await expect(details.locator('img.ev-thumb')).toHaveCount(1);
  await expect(details.locator('[data-copy="COPY-161"]')).toBeVisible();
  await expect(details).toContainText('9230');
  await expect(details.locator('code')).toHaveText('0x2903…513e');
  await expect(details.locator('a')).toHaveAttribute('target', '_blank');
  await expect(details.locator('a')).toHaveAttribute('href', /\/tx\/0xfc1aa443/);

  const failed = await thumbnailPage(open, (route) => route.abort());

  await expect(failed.locator('.tl-ev-facts code').nth(1)).toBeVisible();
  await expect(failed.locator('img.ev-thumb')).toHaveCount(0);
});

test('pattern 32 planter CTA S04: during Funding a planter sees "Claim open slots", and it scrolls to the actions panel', async ({
  open,
}) => {
  const planter = { ...DEWI_VIEWER, role: 'planter' };
  const page = await campaignPage(open, DEMAK_DETAIL, planter);
  const button = page.locator(CONTRIBUTE);

  await expect(button).toHaveText('Claim open slots');
  await button.click();
  await expect(page.locator('#campaign-actions')).toBeInViewport();
});

const expectOfflineBanner = async (page: Page): Promise<void> => {
  await page.context().setOffline(true);
  await expect(page.locator('.app-state .state-banner')).toContainText(OFFLINE);
  await expect(page.locator(OFFLINE_BODY)).toHaveJSProperty('disabled', true);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
};

test('pattern 14 offline S04: the saved campaign stays under the info banner, with the actions and the copy button disabled', async ({
  open,
}) => {
  const page = await campaignPage(open, DEMAK_DETAIL, ALEX_VIEWER);

  await expectOfflineBanner(page);
  await expect(page.locator(CONTRIBUTE)).toBeDisabled();
  await expect(page.getByTitle(WALLET_COPY)).toBeDisabled();

  await page.context().setOffline(false);
  await expect(page.locator('.app-state')).toHaveCount(0);
});

test('pattern 14 offline S06: the saved report stays under the info banner with the load-more button disabled', async ({
  open,
}) => {
  const page = await reportPage(open, { ...REPORT, evidence: FIRST_PAGE });

  await expectOfflineBanner(page);
  await expect(page.getByTestId(MORE_ROW)).toBeDisabled();

  await page.context().setOffline(false);
  await expect(page.locator('.app-state')).toHaveCount(0);
});
