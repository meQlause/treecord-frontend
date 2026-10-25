// docs/FE/features/s23-open-audit.md §7: one test per criterion #1..#11, in the browser, under the docs/FE/fidelity.md §2
// conditions (S23 runs in UTC). Sign-in uses the real Privy test account (backend/.env); the sessions, the campaigns and the open
// write are answered by the spec with the audit.md examples (the backend does not run).
import type { Page } from '@playwright/test';
import { meBody } from './fixtures/accounts';
import { OPEN_ID, CLOSED_ID, CAMPAIGN_ADDRESS, sessionsOf } from './fixtures/audit';
import { ALEX } from './fixtures/shell-accounts';
import { failure } from './helpers/api';
import { openAudit } from './helpers/audit-page';
import { expect, settle, signInWith, test } from './helpers/flow';

const TEST_MS = 120_000;
const HTTP_CONFLICT = 409;
const HTTP_UNAVAILABLE = 503;

test.describe.configure({ timeout: TEST_MS });

const cards = (page: Page) => page.locator('.campaign-card');

const size = (page: Page) => page.getByLabel(/^Sample size/u);

const openButton = (page: Page) => page.getByRole('button', { name: 'Open session', exact: true });

test('#1 a donor sees "Role unavailable" and no sessions request is sent', async ({ open }) => {
  const { page } = await open({ row: 'S23' });
  const seen: string[] = [];

  page.on('request', (request) => seen.push(request.url()));
  await signInWith(page, meBody(ALEX), { returnTo: '/app/audit' });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await expect(page.getByText('Role unavailable')).toBeVisible();
  await expect(page.getByText('This screen is for Auditor accounts.')).toBeVisible();
  expect(seen.filter((url) => url.includes('/audit/sessions'))).toEqual([]);
});

test('#2 the closed session is the first card, with its counts, its report hash and the link to the report', async ({
  open,
}) => {
  const { page } = await openAudit(open);
  const card = cards(page).first();

  for (const text of [
    'Closed',
    '2 of 7',
    '21 Oct 2026, 05:00',
    'Kalimantan Mangrove Restoration',
    'Block #17,000,001',
    '2/2',
    '100%',
    '0 challenges',
    'Report 0x97eb3c93…2c5341',
    'Read the report',
  ]) {
    await expect(card).toContainText(text);
  }

  await expect(card.getByRole('link', { name: 'Read the report' })).toHaveAttribute(
    'href',
    `/app/audit/${CLOSED_ID}/report`,
  );
});

test('#3 the open session is the second card, numbering the sampled trees 1, 2, 3', async ({
  open,
}) => {
  const { page } = await openAudit(open);
  const card = cards(page).nth(1);

  for (const text of [
    'Open',
    '3 of 7',
    '21 Oct 2026, 03:30',
    'Block #17,000,015',
    '1/3',
    '33%',
    '2 challenges',
    'Report on close',
    'Continue the session',
  ]) {
    await expect(card).toContainText(text);
  }

  await expect(card.getByRole('link', { name: 'Continue the session' })).toHaveAttribute(
    'href',
    `/app/audit/${OPEN_ID}`,
  );
  await expect(card.locator('svg').first()).toContainText('123');
});

test('#4 choosing "Closed" asks for status=closed and shows the one closed card', async ({
  open,
}) => {
  const { page, calls } = await openAudit(open);

  await page.getByRole('button', { name: 'Closed', exact: true }).click();
  await expect(cards(page)).toHaveCount(1);
  await expect(page.getByText('1 sessions')).toBeVisible();
  expect(
    calls.some(
      ({ path, params }) => path === '/audit/sessions' && params.get('status') === 'closed',
    ),
  ).toBe(true);
});

test('#5 no sessions says "No sessions yet" and where to start', async ({ open }) => {
  const { page } = await openAudit(open, { sessions: () => sessionsOf([]) });

  await expect(page.getByText('No sessions yet')).toBeVisible();
  await expect(
    page.getByText('Open one above; its sample is drawn from the latest block.'),
  ).toBeVisible();
});

test('#6 opening a session sends the campaign and the size, then opens S24 without another read', async ({
  open,
}) => {
  const { page, opens, calls } = await openAudit(open);

  await size(page).fill('3');
  await openButton(page).click();
  await page.waitForURL(`**/app/audit/${OPEN_ID}`);
  expect(opens[0]?.body).toEqual({ campaign: CAMPAIGN_ADDRESS, sampleSize: 3 });
  expect(calls.filter(({ path }) => path === `/audit/sessions/${OPEN_ID}`)).toEqual([]);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('#7 a campaign with no trees shows the sentence under "Campaign" and stays on the page', async ({
  open,
}) => {
  const { page } = await openAudit(open, { open: () => failure(HTTP_CONFLICT, 'no_trees') });

  await expect(cards(page)).toHaveCount(2);

  await openButton(page).click();
  await expect(page.getByText('No trees planted in this campaign yet.')).toBeVisible();
  await expect(page.locator('select')).toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL(/\/app\/audit$/u);
  await expect(cards(page)).toHaveCount(2);
});

test('#8 a size of 0, 101 or 2.5 is told off under "Sample size" and nothing is sent', async ({
  open,
}) => {
  const { page, opens } = await openAudit(open);

  for (const text of ['0', '101', '2.5']) {
    await size(page).fill(text);
    await openButton(page).click();
    await expect(page.locator('[data-copy="COPY-300"]')).toBeVisible();
    await expect(size(page)).toHaveAttribute('aria-invalid', 'true');
  }

  expect(opens).toEqual([]);
});

test('#9 a double click on "Open session" sends exactly one request', async ({ open }) => {
  const { page, opens } = await openAudit(open);

  await openButton(page).dblclick();
  await page.waitForURL(`**/app/audit/${OPEN_ID}`);
  expect(opens).toHaveLength(1);
});

test('#10 a 503 on open shows the alert, does not navigate and does not try again by itself', async ({
  open,
}) => {
  const { page, opens } = await openAudit(open, {
    open: () => failure(HTTP_UNAVAILABLE, 'service_unavailable'),
  });

  await openButton(page).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Could not load this page' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/app\/audit$/u);
  await settle(page);
  expect(opens).toHaveLength(1);
});

test('#11 an untouched form holds a sample size of 2', async ({ open }) => {
  const { page } = await openAudit(open);

  await expect(size(page)).toHaveValue('2');
});
