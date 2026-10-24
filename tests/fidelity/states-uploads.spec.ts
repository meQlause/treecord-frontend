// docs/phases.md F3b: "UI-gap states reached: refresh (2: S20), empty filtered (9: S20), next page (10: S20), confirm (11:
// discard, FR-121), 72 h purge (29: S20)". The same shape as the earlier state files: each pattern is reached in the real
// app through what the network answers and what this phone holds, never a `?state=` switch.
import { expect, test } from './helpers/flow';
import type { PlanterResponder } from './helpers/planter';
import { LOCAL_ROW, ONCHAIN, SUMMARY_3, uploadsOf } from './fixtures/uploads';
import { THREE, cards, localCard, ofFilter, openUploads } from './helpers/uploads';

const CURSOR = 'eyJ0IjoiMzAwMSJ9';
const HTTP_BAD_REQUEST = 400;
const FADE_MS = 300;
const TEST_MS = 120_000;
const WINDOW_CLOSED = '2026-10-19T08:00:00.000Z';

test.describe.configure({ timeout: TEST_MS });

const more = (page: Parameters<typeof cards>[0]) => page.locator('.load-more').getByRole('button');

test('pattern 2 refresh S20: a pressed filter shows at once, the old cards stay faded and busy, then the new ones land', async ({
  open,
}) => {
  const gate = Promise.withResolvers<void>();
  const { page } = await openUploads(open, {
    local: false,
    answer: ({ url }) =>
      url.searchParams.get('filter') === 'rejected'
        ? { body: uploadsOf(ofFilter('rejected', THREE)), after: gate.promise }
        : { body: uploadsOf(THREE) },
  });
  const grid = page.locator('[aria-busy="true"]');

  await expect(cards(page)).toHaveCount(3);
  await page.getByRole('button', { name: 'Rejected', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rejected', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(grid).toBeVisible();
  await expect(cards(page)).toHaveCount(3);
  await expect(grid).toHaveClass(/is-refreshing/u, { timeout: FADE_MS * 5 });
  gate.resolve();
  await expect(cards(page)).toHaveCount(1);
  await expect(page.locator('.is-refreshing')).toHaveCount(0);
});

test('pattern 9 empty filtered S20: a filter that matches nothing offers "Clear filters", not "No recordings yet"', async ({
  open,
}) => {
  const { page } = await openUploads(open, {
    local: false,
    list: (filter) => uploadsOf(filter === 'rejected' ? [] : THREE),
  });

  await page.getByRole('button', { name: 'Rejected', exact: true }).click();

  const empty = page.locator('.ws-empty');

  await expect(empty.locator('[data-copy="COPY-404"]')).toBeVisible();
  await expect(empty.getByRole('button', { name: 'Clear filters' })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('No recordings yet');
  await empty.getByRole('button', { name: 'Clear filters' }).click();
  await expect(cards(page)).toHaveCount(3);
});

const pages =
  (gate: Promise<void>, failing: boolean): PlanterResponder =>
  ({ url }) => {
    if (!url.searchParams.has('cursor')) {
      return {
        body: { ...uploadsOf([THREE[0] ?? {}], SUMMARY_3), nextCursor: CURSOR, total: 3 },
      };
    }

    return failing
      ? {
          status: HTTP_BAD_REQUEST,
          body: { error: { code: 'invalid_cursor', message: 'x' } },
        }
      : { body: uploadsOf([ONCHAIN], SUMMARY_3), after: gate };
  };

test('pattern 10 next page S20: the row says "1 of 3", reads Loading… while pending and ends with the card appended', async ({
  open,
}) => {
  const gate = Promise.withResolvers<void>();
  const { page } = await openUploads(open, { local: false, answer: pages(gate.promise, false) });

  await expect(cards(page)).toHaveCount(1);
  await expect(page.locator('.load-more')).toContainText('1 of 3');
  await more(page).click();
  await expect(more(page)).toBeDisabled();
  await expect(more(page)).toHaveAttribute('aria-busy', 'true');
  await expect(more(page)).toContainText('Loading…');
  gate.resolve();
  await expect(cards(page)).toHaveCount(2);
});

test('pattern 10 next page S20: a bad cursor keeps the cards, shows an alert, and "Try again" resends the same cursor', async ({
  open,
}) => {
  const { page, lists } = await openUploads(open, {
    local: false,
    answer: pages(Promise.resolve(), true),
  });

  await expect(cards(page)).toHaveCount(1);
  await more(page).click();

  const alert = page.getByRole('alert').filter({ has: page.locator('[data-copy="COPY-201"]') });

  await expect(alert).toBeVisible();
  await expect(cards(page)).toHaveCount(1);
  await alert.getByRole('button', { name: 'Try again' }).click();
  await expect
    .poll(() => lists.filter((url) => url.searchParams.get('cursor') === CURSOR).length)
    .toBe(2);
});

test('pattern 11 confirm S20 (FR-121): the discard question names the recording it would delete, first', async ({
  open,
}) => {
  const { page } = await openUploads(open);

  await localCard(page).getByRole('button', { name: 'Discard' }).click();

  const card = localCard(page);

  await expect(card.locator('.ws-facts')).toContainText('Tree #3001');
  await expect(card.locator('.ws-facts')).toContainText('Check-in · month 6');
  await expect(card.locator('.ws-facts')).toContainText('Recorded');
  await expect(card.locator('.ws-facts + [role="alert"]')).toContainText('Discard this recording?');
});

test('pattern 29 72 h purge S20: a recording past its window stays, marked, and can only be discarded', async ({
  open,
}) => {
  const { page } = await openUploads(open, {
    row: { ...LOCAL_ROW, capturedAt: WINDOW_CLOSED },
  });
  const card = cards(page).filter({ has: page.getByRole('button', { name: 'Upload now' }) });

  await expect(card.locator('.badge [data-copy="COPY-421"]')).toBeVisible();
  await expect(card.locator('.pl-reason')).toContainText(
    'Uploaded more than 72 hours after recording',
  );
  await expect(card.getByRole('button', { name: 'Upload now' })).toBeDisabled();
  await expect(card.getByRole('button', { name: 'Discard' })).toBeEnabled();
});
