// The UI-gap states of Phase F5 (docs/FE/ui-gaps-treatments.md §3): refresh (2), empty filtered (9) and next page (10) on S23,
// confirm (11) on D13, and the conflict (5) of S25 not already in s25-sampled-tree.flow.spec.ts (`session_closed`,
// `challenge_active` and `tree_not_alive` are #8, #10 and #11 there; S24 `findings_incomplete` is #8 of its own spec).
import type { Page } from '@playwright/test';
import { CLOSED_ITEM, OPEN_ID, OPEN_ITEM, sessionsOf } from './fixtures/audit';
import { COMPLETE, DETAIL } from './fixtures/audit-session';
import { EXPIRED } from './fixtures/audit-tree';
import { failure } from './helpers/api';
import { openAudit } from './helpers/audit-page';
import { expect, test } from './helpers/flow';

const TEST_MS = 120_000;
const FADE_MS = 1000;
const CURSOR = 'eyJjIjoiMiJ9';
const HTTP_BAD_REQUEST = 400;

test.describe.configure({ timeout: TEST_MS });

const cards = (page: Page) => page.locator('.campaign-card');

const more = (page: Page) => page.locator('.load-more').getByRole('button');

test('pattern 2 refresh S23: a pressed filter shows at once, the old cards stay faded and busy, then the new ones land', async ({
  open,
}) => {
  const gate = Promise.withResolvers<void>();
  const { page } = await openAudit(open);

  await page.route('**/api/v1/audit/sessions?*status=closed*', async (route) => {
    await gate.promise;
    await route.fallback();
  });
  await expect(cards(page)).toHaveCount(2);
  await page.getByRole('button', { name: 'Closed', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Closed', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(cards(page)).toHaveCount(2);
  await expect(page.locator('.campaign-grid')).toHaveClass(/is-refreshing/u, {
    timeout: FADE_MS * 5,
  });
  await expect(page.locator('.campaign-grid')).toHaveAttribute('aria-busy', 'true');
  gate.resolve();
  await expect(cards(page)).toHaveCount(1);
  await expect(page.locator('.is-refreshing')).toHaveCount(0);
});

test('pattern 9 empty filtered S23: a filter that matches nothing offers "Clear filters", not "No sessions yet"', async ({
  open,
}) => {
  const { page } = await openAudit(open, {
    sessions: (call) =>
      call.params.get('status') === 'open' ? sessionsOf([]) : sessionsOf([CLOSED_ITEM, OPEN_ITEM]),
  });

  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(page.locator('[data-copy="COPY-405"]')).toBeVisible();
  await expect(page.getByText('No sessions yet')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(cards(page)).toHaveCount(2);
});

test('pattern 10 next page S23: the row says "1 of 3", reads Loading… while pending and ends with the card appended', async ({
  open,
}) => {
  const gate = Promise.withResolvers<void>();
  const { page } = await openAudit(open, {
    sessions: (call) =>
      call.params.get('cursor') === null
        ? { ...sessionsOf([CLOSED_ITEM], CURSOR), total: 3 }
        : { ...sessionsOf([OPEN_ITEM]), total: 3 },
  });

  await page.route('**/api/v1/audit/sessions?*cursor=*', async (route) => {
    await gate.promise;
    await route.fallback();
  });
  await expect(page.getByText('1 of 3')).toBeVisible();
  await more(page).click();
  await expect(page.locator('.load-more button[aria-busy="true"]')).toContainText('Loading…');
  await expect(page.locator('.load-more button[aria-busy="true"]')).toBeDisabled();
  gate.resolve();
  await expect(cards(page)).toHaveCount(2);
});

test('pattern 10 next page S23: a bad cursor keeps the cards, shows an alert, and "Try again" resends the same cursor', async ({
  open,
}) => {
  const { page, calls } = await openAudit(open, {
    sessions: (call) =>
      call.params.get('cursor') === null
        ? { ...sessionsOf([CLOSED_ITEM], CURSOR), total: 3 }
        : failure(HTTP_BAD_REQUEST, 'invalid_cursor'),
  });

  await more(page).click();
  await expect(page.locator('[data-copy="COPY-302"]')).toBeVisible();
  await expect(cards(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Try again' }).click();

  const cursors = calls
    .filter(({ params }) => params.get('cursor') !== null)
    .map(({ params }) => params.get('cursor'));

  expect(cursors).toEqual([CURSOR, CURSOR]);
});

test('pattern 11 confirm S24 D13: the review names the session above the summary', async ({
  open,
}) => {
  const { page } = await openAudit(open, {
    path: `/app/audit/${OPEN_ID}`,
    session: () => COMPLETE,
  });

  await page.getByRole('button', { name: 'Close session', exact: true }).click();

  const region = page.getByRole('region', { name: 'Review Close session' });

  await expect(region.getByText('Session', { exact: true })).toBeVisible();
  await expect(region.getByText('Kalimantan Mangrove Restoration · e9219997')).toBeVisible();
  await expect(region).toContainText('The report is frozen, hashed');
});

test('pattern 5 conflict S25 D12: a challenge for a tree outside the sample says so and keeps the button off', async ({
  open,
}) => {
  const { page } = await openAudit(open, {
    path: `/app/audit/${OPEN_ID}/trees/3001`,
    session: () => DETAIL,
    bundle: () => EXPIRED,
    challenge: () => failure(404, 'not_found'),
  });

  await page.getByRole('button', { name: 'Issue challenge', exact: true }).click();
  await page
    .getByRole('region', { name: 'Review Issue challenge' })
    .getByRole('button', { name: 'Confirm' })
    .click();
  await expect(page.getByText('Only sampled trees can be challenged.')).toBeVisible();
});
