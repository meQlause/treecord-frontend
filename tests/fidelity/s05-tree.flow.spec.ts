// docs/FE/features/s05-tree.md §7: one test per acceptance criterion outside the D07 flag form, asserting its Then
// column under the fidelity.md §2 conditions (Asia/Jakarta, frozen clock, reduced motion). The API answers are the
// trees.md / flags.md examples, served with page.route (the backend does not run); signed-in criteria sign in through
// the real Privy test account and the answer carries the viewer the criterion names.
//
// Left for F4a (the D07 flag form: reason field, POST /flags, wallet `flag`, receipt, refusal):
//   #9  typing a reason, "Flag tree" disabled below 10 characters, POST body, "Reason saved", wallet request
//   #10 wallet rejection, the pending callout after the re-read, the retry button without a second POST
//   #12 receipt success, the re-read with `flagged`, the "Flag opened" toast
//   #14 POST 403 `not_contributor`: the alert, then the form gone after the refetch
// #5, #7, #11 and #13 only say that no flag form shows; they hold today because the form is not built, and keep
// holding when F4a builds it.
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { stubApi, errorBody, type Answer } from './helpers/api-report';
import { SARI } from './fixtures/accounts';
import { ALEX } from './fixtures/shell-accounts';
import {
  ALEX_3103,
  DEAD_TREE,
  EMPTY_TIMELINE,
  SARI_3001,
  SARI_3104,
  TREE_3001,
  TREE_3021,
  TREE_3091,
} from './fixtures/tree';
import { expect, signedInAt, test, type OpenOptions, type Opened } from './helpers/flow';
import { VIEWPORTS } from './matrix';

const WIDE = VIEWPORTS[1];
const PHONE = VIEWPORTS[0];
const ROW = 'S05';
const TEST_MS = 120_000;
const FIRST_PAINT_MS = 30_000;
const RAKA = { ...SARI, role: 'operator' as const, displayName: 'Raka' };
const FLAG_ID = '1f6c2a9e-4b7d-4e15-9a3c-8d2e5f0b7a61';

test.describe.configure({ timeout: TEST_MS });

type Open = (options?: OpenOptions) => Promise<Opened>;

/** `GET /trees/:id` answers the body of that id; any other id is unknown (404). */
const trees =
  (bodies: Readonly<Record<string, unknown>>): Answer =>
  (url) => {
    const id = /^\/api\/v1\/trees\/(\d+)$/.exec(url.pathname)?.[1] ?? '';
    const body = bodies[id];

    return body === undefined ? undefined : { body };
  };

/** A signed-out visitor on `/trees/{id}`. */
const visitor = async (
  open: Open,
  bodies: Readonly<Record<string, unknown>>,
  id: string,
  viewport: (typeof VIEWPORTS)[number] = WIDE,
): Promise<Page> => {
  const { page } = await open({ row: ROW, viewport });

  await stubApi(page, trees(bodies));
  await page.goto(`/trees/${id}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: FIRST_PAINT_MS });

  return page;
};

/** Signed in as `profile` (the real Privy test account), then on `/trees/{id}`. */
const signedIn = async (
  open: Open,
  profile: typeof SARI,
  bodies: Readonly<Record<string, unknown>>,
  id: string,
): Promise<Page> => {
  const { page } = await open({ row: ROW, viewport: WIDE });

  await stubApi(page, trees(bodies));
  await signedInAt(page, profile, `/trees/${id}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: FIRST_PAINT_MS });

  return page;
};

const fact = (page: Page, name: string) =>
  page
    .locator('.tr-panel .ws-facts > div')
    .filter({ has: page.locator('dt', { hasText: new RegExp(`^${name}$`) }) })
    .locator('dd');

const panel = (page: Page, title: string) =>
  page.locator('section.ws-panel').filter({ has: page.getByRole('heading', { name: title }) });

const scheduleRows = (page: Page) => panel(page, 'Milestone schedule').locator('tbody tr');

const cells = (row: ReturnType<typeof scheduleRows>) => row.locator('td').allTextContents();

test('S05 #1 tree 3001 signed out shows the record at an approximate location', async ({
  open,
}) => {
  const page = await visitor(open, { '3001': TREE_3001 }, '3001');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tree #3001');
  await expect(page.locator('.hero-coordinate')).toHaveText('TREE #3001 / BANYUMAS, CENTRAL JAVA');
  await expect(page.locator('.tr-hero .ws-tag')).toHaveText('Alive');
  await expect(page.locator('.tr-hero h2')).toHaveText('Roots that stay');
  await expect(page.locator('.tr-hero .location')).toHaveText('Banyumas, Central Java');
  await expect(page.locator('.tr-hero .cb-prov-meta')).toHaveText('Mahogany · planted 18 Apr 2026');
  await expect(fact(page, 'Location')).toHaveText('-7.432, 109.247 · Approximate');
  await expect(fact(page, 'Planted')).toHaveText('18 Apr 2026');
  await expect(fact(page, 'Tree tag')).toHaveText('TC-K7QM-3XRA');
  await expect(fact(page, 'Replant deadline')).toHaveText('—');
  await expect(fact(page, 'Payout clock')).toHaveText('Milestone windows');
  expect(await page.content()).not.toContain('-7.431205');
});

test('S05 #2 the milestone schedule lists the six windows with their amounts and statuses', async ({
  open,
}) => {
  const page = await visitor(open, { '3001': TREE_3001 }, '3001');
  const expected = [
    ['Month 0', '18 Apr 2026 – 18 May 2026', '1.05 USDC', 'Paid'],
    ['Month 3', '17 Jul 2026 – 16 Aug 2026', '1.05 USDC', 'Paid'],
    ['Month 6', '15 Oct 2026 – 14 Nov 2026', '1.05 USDC', 'Open'],
    ['Month 12', '13 Apr 2027 – 13 May 2027', '1.575 USDC', 'Upcoming'],
    ['Month 24', '7 Apr 2028 – 7 May 2028', '1.575 USDC', 'Upcoming'],
    ['Month 36', '2 Apr 2029 – 2 May 2029', '4.2 USDC', 'Upcoming'],
  ];

  await expect(scheduleRows(page)).toHaveCount(expected.length);

  for (const [index, row] of expected.entries()) {
    expect(await cells(scheduleRows(page).nth(index))).toEqual(row);
  }
});

test('S05 #3 the timeline lists planting and the month-3 check-in with its score and transaction link', async ({
  open,
}) => {
  const page = await visitor(open, { '3001': TREE_3001 }, '3001');
  const rows = panel(page, 'Evidence timeline').locator('ol > li');

  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator('> span')).toHaveText('18 Apr 2026');
  await expect(rows.nth(0).locator('h3')).toHaveText('Planted');
  await expect(rows.nth(0).locator('> p')).toHaveText('Tree planted.');
  await expect(rows.nth(1).locator('> span')).toHaveText('20 Jul 2026');
  await expect(rows.nth(1).locator('h3')).toHaveText('Survival check · month 3');
  await expect(rows.nth(1).locator('> p')).toHaveText('Milestone paid.');
  await expect(rows.nth(1).locator('.tl-ev-facts')).toContainText('9230');
  await expect(rows.nth(1).locator('.tl-ev-facts a')).toHaveAttribute(
    'href',
    /\/tx\/0xfc1aa443[0-9a-f]+$/,
  );
});

test('S05 #4 payouts, the lifecycle card and the empty flags panel read the paid milestones', async ({
  open,
}) => {
  const page = await visitor(open, { '3001': TREE_3001 }, '3001');
  const lifecycle = page.getByLabel('Lifecycle');

  await expect(panel(page, 'Payouts & forfeits')).toContainText('2 milestones · 2.1 USDC');
  await expect(panel(page, 'Payouts & forfeits')).toContainText('0x4b9e…9d0e · 0xfc1aa443…');
  await expect(
    panel(page, 'Payouts & forfeits')
      .locator('.ws-facts > div')
      .filter({ hasText: 'Forfeited' })
      .locator('dd'),
  ).toHaveText('None');
  await expect(lifecycle).toContainText('2/6');
  await expect(lifecycle).toContainText('Paid to planter');
  await expect(lifecycle).toContainText('2.1');
  await expect(lifecycle).toContainText('Alive · month 6');
  await expect(lifecycle).toContainText(
    'Of 10.5 USDC per tree; payouts follow the milestone windows.',
  );
  await expect(panel(page, 'Flags')).toContainText('No on-chain flags.');
});

test('S05 #5 tree 3001 signed out has no flag field, no Reprint and no signed-in note', async ({
  open,
}) => {
  const page = await visitor(open, { '3001': TREE_3001 }, '3001');

  await expect(page.getByLabel('Flag reason')).toHaveCount(0);
  await expect(page.getByText('Reprint')).toHaveCount(0);
  await expect(
    page.getByText('Chain windows, pause duration and settlement decide each payout.'),
  ).toHaveCount(0);
});

test('S05 #6 Raka sees the flagged tree 3091 with its open flag and a link to resolve it', async ({
  open,
}) => {
  const page = await signedIn(open, RAKA, { '3091': TREE_3091 }, '3091');
  const flags = panel(page, 'Flags');
  const statuses = (await scheduleRows(page).locator('td:last-child').allTextContents()).map(
    (text) => text.trim(),
  );

  await expect(page.locator('.tr-hero .ws-tag')).toHaveText('Flagged');
  await expect(fact(page, 'Payout clock')).toHaveText('Paused');
  expect(statuses).toEqual(['Paid', 'Paid', 'Paused', 'Paused', 'Paused', 'Paused']);
  await expect(flags).toContainText('#1f6c2a9e');
  await expect(flags).toContainText('Open');
  await expect(flags).toContainText('Tree condition needs an independent check.');
  await expect(flags).toContainText('Not resolved');
  await expect(flags.getByRole('link', { name: 'Resolve flag' })).toHaveAttribute(
    'href',
    `/app/operator/trees/3091/flags/${FLAG_ID}`,
  );
});

test('S05 #7 Sari sees the exact location and Reprint, which downloads the tag card', async ({
  open,
}) => {
  const page = await signedIn(open, SARI, { '3001': SARI_3001 }, '3001');
  const reprint = page.getByRole('link', { name: 'Reprint' });

  await expect(fact(page, 'Location')).toHaveText('-7.431205, 109.247813');
  await expect(reprint).toBeVisible();
  await expect(page.getByLabel('Flag reason')).toHaveCount(0);

  const [download] = await Promise.all([page.waitForEvent('download'), reprint.click()]);
  const file = await download.path();

  expect(download.suggestedFilename()).toBe('TC-K7QM-3XRA.svg');
  expect(readFileSync(file, 'utf8')).toContain('Tree #3001 · Roots that stay');
});

test('S05 #8 Sari sees her month-6 check-in in review and a link to its evidence', async ({
  open,
}) => {
  const page = await signedIn(open, SARI, { '3104': SARI_3104 }, '3104');

  await expect(page.getByRole('link', { name: 'Month 6 check-in · needs review' })).toHaveAttribute(
    'href',
    '/app/evidence/9c2b7e4a-3d1f-4a8e-b6c5-0f9e8d7a6b53',
  );
  await expect(page.getByRole('link', { name: 'Record check-in' })).toHaveCount(0);
});

test('S05 #11 Alex on tree 3103 sees the pending callout and no flag form', async ({ open }) => {
  const page = await signedIn(open, ALEX, { '3103': ALEX_3103 }, '3103');

  await expect(panel(page, 'Flags')).toContainText(
    'Pending · Reason saved; wallet transaction has not been confirmed. Reason saved; no on-chain flag or pause yet.',
  );
  await expect(fact(page, 'Payout clock')).toHaveText('Milestone windows');
  await expect(page.getByLabel('Flag reason')).toHaveCount(0);
});

test('S05 #13 Alex on the flagged tree 3091 sees no flag form', async ({ open }) => {
  const page = await signedIn(open, ALEX, { '3091': TREE_3091 }, '3091');

  await expect(page.locator('.tr-hero .ws-tag')).toHaveText('Flagged');
  await expect(page.getByLabel('Flag reason')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Flag tree' })).toHaveCount(0);
});

test('S05 #15 a removed tree forfeits every unpaid milestone', async ({ open }) => {
  const page = await visitor(open, { '3021': TREE_3021 }, '3021');
  const statuses = (await scheduleRows(page).locator('td:last-child').allTextContents()).map(
    (text) => text.trim(),
  );

  expect(statuses).toEqual(['Paid', 'Paid', 'Forfeited', 'Forfeited', 'Forfeited', 'Forfeited']);
  await expect(
    panel(page, 'Payouts & forfeits')
      .locator('.ws-facts > div')
      .filter({ hasText: 'Forfeited' })
      .locator('dd'),
  ).toHaveText('Unpaid milestones forfeited');
});

test('S05 #16 a dead tree shows its replant deadline', async ({ open }) => {
  const page = await visitor(open, { '3050': DEAD_TREE }, '3050');

  await expect(page.locator('.tr-hero .ws-tag')).toHaveText('Dead');
  await expect(fact(page, 'Replant deadline')).toHaveText('4 Nov 2026');
});

test('S05 #17 a tree with no events shows "No indexed events"', async ({ open }) => {
  const page = await visitor(open, { '3001': EMPTY_TIMELINE }, '3001');

  await expect(panel(page, 'Evidence timeline')).toContainText('No indexed events');
});

test('S05 #18 an unknown tree id shows the not-found state with a link to the campaigns', async ({
  open,
}) => {
  const { page } = await open({ row: ROW, viewport: WIDE });

  await stubApi(page, () => ({ status: 404, body: errorBody('not_found') }));
  await page.goto('/trees/99999');

  await expect(page.getByRole('heading', { name: 'Tree #99999 doesn’t exist' })).toBeVisible({
    timeout: FIRST_PAINT_MS,
  });
  await expect(page.getByText('No campaign issues this tree id.')).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Campaigns' })).toHaveAttribute(
    'href',
    '/campaigns',
  );
});

test('S05 #19 at 360 px the page does not scroll sideways', async ({ open }) => {
  const page = await visitor(open, { '3001': TREE_3001 }, '3001', PHONE);

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    PHONE.width,
  );
});
