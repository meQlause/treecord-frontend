// docs/phases.md F3a: "UI-gap states reached: refresh (2: S16), empty filtered (9: S16, S17), next page (10: S16, S18),
// confirm (11: D03), device warnings (26: S22)". The same shape as the earlier state files (states.spec.ts is at its line
// limit): each pattern is reached in the real app through what the network answers, never a `?state=` switch.
// Sign-in uses the real Privy test account; `GET /me` follows the profile the spec holds.
import type { Page } from '@playwright/test';
import { SARI } from './fixtures/accounts';
import type { Json } from './fixtures/campaigns';
import { CHALLENGE_R4M9, challengesOf } from './fixtures/challenges';
import { DEVICE, DEVICE_ID, THUMBPRINT, devicesOf } from './fixtures/device';
import { SLOT_41, TREE_3001, flaggedTree, slotsOf, treesOf } from './fixtures/planter';
import { answerDevices, seedDevice, type DeviceCall } from './helpers/device';
import { expect, test, type OpenOptions } from './helpers/flow';
import { answerPlanter, type PlanterResponder } from './helpers/planter';
import { openSignedIn } from './helpers/signed-in';

const CURSOR = 'eyJ0IjoiMzAwMSJ9';
const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;
const FADE_MS = 300;
const TEST_MS = 120_000;

test.describe.configure({ timeout: TEST_MS });

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

/** Opens a planter list as Sari with `answer` replying to its reads. */
const openList = async (
  open: Open,
  row: string,
  path: string,
  answer: PlanterResponder,
): Promise<Page> => {
  const { page } = await openSignedIn(open, { row, profile: SARI, path }, (target) =>
    answerPlanter(target, answer, []),
  );

  return page;
};

const more = (page: Page) => page.locator('.load-more').getByRole('button');

test('pattern 2 refresh S16: a pressed filter shows at once, the old cards stay faded and busy, then the new ones land', async ({
  open,
}) => {
  const gate = Promise.withResolvers<void>();
  const page = await openList(open, 'S16', '/app/planter/trees', ({ url }) =>
    url.searchParams.get('status') === 'flagged'
      ? { body: treesOf([flaggedTree], { total: 2 }), after: gate.promise }
      : { body: treesOf([TREE_3001, flaggedTree]) },
  );
  const grid = page.locator('[aria-busy="true"]');
  const cards = page.locator('.campaign-card');

  await expect(cards).toHaveCount(2);
  await page.getByRole('button', { name: 'Flagged', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Flagged', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(grid).toBeVisible();
  await expect(cards).toHaveCount(2);
  await expect(grid).toHaveClass(/is-refreshing/, { timeout: FADE_MS * 5 });
  gate.resolve();
  await expect(cards).toHaveCount(1);
  await expect(page.locator('.is-refreshing')).toHaveCount(0);
});

test('pattern 9 empty filtered S16: a filter that matches nothing offers "Clear filters", never "View slots"', async ({
  open,
}) => {
  const page = await openList(open, 'S16', '/app/planter/trees', ({ url }) => ({
    body: url.searchParams.has('status') ? treesOf([], { total: 0 }) : treesOf([TREE_3001]),
  }));

  await page.getByRole('button', { name: 'Dead', exact: true }).click();

  const empty = page.locator('.ws-empty');

  await expect(empty).toContainText('No matching trees');
  await expect(empty.getByRole('button', { name: 'Clear filters' })).toBeVisible();
  await expect(empty.getByRole('link', { name: 'View slots' })).toHaveCount(0);
  await expect(page.locator('.pl-duo')).toBeVisible();
  await empty.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.campaign-card')).toHaveCount(1);
});

test('pattern 9 empty filtered S17: a filter with no slot offers "Clear filters", not "No unplanted slots"', async ({
  open,
}) => {
  const page = await openList(open, 'S17', '/app/planter/slots', () => ({
    body: slotsOf([SLOT_41]),
  }));

  await page.getByRole('button', { name: 'Assigned', exact: true }).click();

  const empty = page.locator('.ws-empty');

  await expect(empty.locator('[data-copy="COPY-403"]')).toBeVisible();
  await expect(empty.getByRole('button', { name: 'Clear filters' })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('No unplanted slots');
  await empty.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.campaign-card')).toHaveCount(1);
});

test('pattern 10 next page S16: the row says "1 of 3", reads Loading… while pending and ends with the card appended', async ({
  open,
}) => {
  const gate = Promise.withResolvers<void>();
  const page = await openList(open, 'S16', '/app/planter/trees', ({ url }) =>
    url.searchParams.has('cursor')
      ? { body: treesOf([flaggedTree], { total: 3 }), after: gate.promise }
      : { body: treesOf([TREE_3001], { total: 3, nextCursor: CURSOR }) },
  );

  await expect(page.locator('.campaign-card')).toHaveCount(1);
  await expect(page.locator('.load-more')).toContainText('1 of 3');
  await more(page).click();
  await expect(more(page)).toBeDisabled();
  await expect(more(page)).toHaveAttribute('aria-busy', 'true');
  await expect(more(page)).toContainText('Loading…');
  gate.resolve();
  await expect(page.locator('.campaign-card')).toHaveCount(2);
});

test('pattern 10 next page S18: a bad cursor keeps the tickets, shows an alert, and "Try again" resends the same cursor', async ({
  open,
}) => {
  const asked: URL[] = [];
  const { page } = await openSignedIn(
    open,
    { row: 'S18', profile: SARI, path: '/app/planter/challenges' },
    (target) =>
      answerPlanter(
        target,
        ({ url }) =>
          url.searchParams.has('cursor')
            ? {
                status: HTTP_BAD_REQUEST,
                body: { error: { code: 'invalid_cursor', message: 'x' } },
              }
            : { body: { ...challengesOf([CHALLENGE_R4M9]), nextCursor: CURSOR, total: 2 } as Json },
        asked,
      ),
  );

  await expect(page.locator('.pl-ticket')).toHaveCount(1);
  await more(page).click();

  const alert = page.getByRole('alert');

  await expect(alert).toBeVisible();
  await expect(page.locator('.pl-ticket')).toHaveCount(1);
  await alert.getByRole('button', { name: 'Try again' }).click();
  await expect
    .poll(() => asked.filter((url) => url.searchParams.get('cursor') === CURSOR).length)
    .toBe(2);
});

/** Opens S22 with the fixture device and the key this phone holds for it. */
const openDevice = async (open: Open, options: { rows?: number; post?: Json }): Promise<Page> => {
  const calls: DeviceCall[] = [];
  const { page } = await openSignedIn(
    open,
    { row: 'S22', profile: SARI, path: '/app/planter/device' },
    async (target) => {
      await seedDevice(target, SARI.id, {
        key: {
          thumbprint: THUMBPRINT,
          deviceId: DEVICE_ID,
          label: 'Pixel 8',
          createdAt: '2026-10-23T03:20:15.067Z',
        },
        rows: Array.from({ length: options.rows ?? 0 }, () => ({
          profileId: SARI.id,
          payload: { deviceKey: THUMBPRINT },
        })),
      });
      await answerDevices(
        target,
        ({ method }) =>
          method === 'GET'
            ? { body: devicesOf([DEVICE]) }
            : { status: HTTP_CONFLICT, body: options.post },
        calls,
      );
    },
  );

  return page;
};

test('pattern 11 confirm S22 D03: the review names the device it would revoke, above the summary', async ({
  open,
}) => {
  const page = await openDevice(open, {});

  await page.getByRole('button', { name: 'Revoke this device' }).click();

  const review = page.getByRole('region', { name: /^Review / });
  const facts = review.locator('.ws-facts');

  await expect(facts).toContainText('Device label');
  await expect(facts).toContainText('Pixel 8');
  await expect(review.locator('h3 + .ws-facts + p')).toContainText('The server stops accepting');
});

test('pattern 26 device warnings S22: the revoke warning is a callout inside the review, above "Confirm", with the count', async ({
  open,
}) => {
  const page = await openDevice(open, { rows: 2 });

  await page.getByRole('button', { name: 'Revoke this device' }).click();

  const review = page.getByRole('region', { name: /^Review / });
  const callout = review.locator('.ws-callout');

  await expect(callout).toBeVisible();
  await expect(review.locator('[data-count="2"]')).toBeVisible();
  const order = await review.evaluate((element) => {
    const warning = element.querySelector('.ws-callout');
    const confirm = [...element.querySelectorAll('button')].find(
      (button) => button.textContent === 'Confirm',
    );

    return warning !== null && confirm !== undefined
      ? Boolean(warning.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING)
      : false;
  });

  expect(order).toBe(true);
});
