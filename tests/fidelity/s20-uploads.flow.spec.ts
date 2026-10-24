// docs/FE/features/s20-uploads.md §7: one test per criterion #1..#12, in the browser, under the docs/FE/fidelity.md §2
// conditions (S20: clock 2026-10-23T10:00:00Z, UTC). Sign-in uses the real Privy test account; `GET /me`, the planter
// uploads list and the evidence endpoints are answered by the spec (the backend does not run). The one local row and its
// clip are seeded into this phone's IndexedDB before the app loads, and read back after.
import { CHECKING, ONCHAIN, REJECTED_ID, STALE, SUMMARY_3, uploadsOf } from './fixtures/uploads';
import { refusal } from './fixtures/record';
import { expect, settle, test } from './helpers/flow';
import type { Recorded } from './helpers/record';
import { readClipIds, readQueue } from './helpers/record';
import { THREE, cards, localCard, ofFilter, openUploads } from './helpers/uploads';

const TEST_MS = 120_000;
const HTTP_UNPROCESSABLE = 422;
const POLL_WINDOW_MS = 7000;
const QUIET_MS = 8000;
const QUICK_MS = 1500;

test.describe.configure({ timeout: TEST_MS });

const submitted = (record: Recorded): boolean =>
  record.api.some(({ path }) => path.endsWith('/submit'));

test('#1 the meta counts the local row, and "Waiting" shows it alone without asking the server', async ({
  open,
}) => {
  const { page, lists } = await openUploads(open);

  await expect(page.locator('.results-meta')).toContainText('4 recordings');
  await expect(page.locator('.results-meta')).toContainText('1 waiting to upload');

  const asked = lists.length;

  await page.getByRole('button', { name: 'Waiting', exact: true }).click();
  await expect(cards(page)).toHaveCount(1);
  await expect(page.locator('.results-meta')).toContainText('1 recordings of 4');
  await settle(page, QUICK_MS);
  expect(lists).toHaveLength(asked);
});

test('#2 the local card shows its badge, kind, tree, facts and two buttons', async ({ open }) => {
  const { page } = await openUploads(open);
  const card = localCard(page);

  await expect(card).toContainText('Check-in · month 6');
  await expect(card.locator('h2')).toHaveText('Tree #3001');
  await expect(card.locator('h2 a')).toHaveCount(0);
  await expect(card.locator('.pl-facts')).toContainText('7.2 s');
  await expect(card.locator('.pl-facts')).toContainText('±8.4 m');
  await expect(card.locator('.pl-facts')).toContainText('26 Oct 2026');
  await expect(card.getByRole('button', { name: 'Upload now' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Discard' })).toBeVisible();
});

test('#3 the rejected card says why, crosses "Checks" and opens its submission', async ({
  open,
}) => {
  const { page } = await openUploads(open);
  const card = cards(page).filter({ hasText: 'Tree #3001' }).filter({ hasText: 'Rejected' });

  await expect(card.locator('.badge')).toHaveText('Rejected');
  await expect(card.locator('.pl-facts')).toContainText('17 Oct 2026, 06:40');
  await expect(card.locator('.pl-facts')).toContainText('6 s');
  await expect(card.locator('.pl-facts')).toContainText('20 Oct 2026');
  await expect(card.locator('.pl-reason')).toHaveText('GPS accuracy too low (41.0 m)');
  await expect(card.locator('svg path[stroke="#9c4a36"]')).toHaveCount(2);
  await card.getByRole('link', { name: 'View submission' }).click();
  await page.waitForURL(`**/app/evidence/${REJECTED_ID}`);
});

test('#4 the review card reads "Needs review" with its facts, and its picture stands on "Review"', async ({
  open,
}) => {
  const { page } = await openUploads(open);
  const card = cards(page).filter({ hasText: 'Tree #3104' });

  await expect(card.locator('.badge')).toHaveText('Needs review');
  await expect(card.locator('.pl-facts')).toContainText('±8.4 m');
  await expect(card.locator('.pl-facts')).toContainText('7 s');
  await expect(card.locator('svg text', { hasText: 'Review' })).toBeVisible();
});

test('#5 a landed planting shows its kind, its tree and "On-chain"', async ({ open }) => {
  const { page } = await openUploads(open);
  const card = cards(page).filter({ hasText: 'Planting' });

  await expect(card.locator('h2')).toHaveText('Tree #3001');
  await expect(card.locator('.badge')).toHaveText('On-chain');
});

test('#6 offline, the header line says so and "Upload now" is disabled', async ({ open }) => {
  const { page } = await openUploads(open);

  await expect(localCard(page)).toBeVisible();
  await page.context().setOffline(true);
  await expect(page.locator('.pl-status')).toContainText(/^Offline/u);
  await expect(page.getByRole('button', { name: 'Upload now' })).toBeDisabled();
});

test('#7 "Discard" asks first; "Keep it" keeps the card, "Discard" deletes the row and the clip, sending nothing', async ({
  open,
}) => {
  const { page, record } = await openUploads(open);

  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(page.getByRole('alert')).toContainText('Discard this recording?');
  await page.getByRole('button', { name: 'Keep it' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(localCard(page)).toBeVisible();
  await page.getByRole('button', { name: 'Discard' }).click();
  await page.getByRole('button', { name: 'Discard', exact: true }).last().click();
  await expect(localCard(page)).toHaveCount(0);
  expect(await readQueue(page)).toHaveLength(0);
  expect(await readClipIds(page)).toHaveLength(0);
  expect(record.api).toHaveLength(0);
});

test('#8 sending the row with a 202 clears it and the list shows the submission "Checking"', async ({
  open,
}) => {
  const { page } = await openUploads(open, {
    list: (filter, record) =>
      uploadsOf(
        ofFilter(filter, submitted(record) ? [CHECKING, ...THREE] : THREE),
        submitted(record) ? { ...SUMMARY_3, all: 4, sent: 3 } : SUMMARY_3,
      ),
  });

  await page.getByRole('button', { name: 'Upload now' }).click();
  await expect(cards(page).filter({ hasText: 'Checking' }).locator('.badge')).toHaveText(
    'Checking',
  );
  await expect(localCard(page)).toHaveCount(0);
  expect(await readQueue(page)).toHaveLength(0);
});

test('#9 a refused upload link shows the sentence and the reasons, and keeps the row', async ({
  open,
}) => {
  const { page } = await openUploads(open, {
    server: {
      uploadUrl: {
        status: HTTP_UNPROCESSABLE,
        body: refusal('precheck_failed', { reasons: ['milestone_not_open'] }),
      },
    },
  });

  await page.getByRole('button', { name: 'Upload now' }).click();
  await expect(localCard(page).getByRole('alert')).toContainText(
    'Rejected by the prechecks. See why.',
  );
  await expect(localCard(page).getByRole('alert')).toContainText('The check-in window isn’t open');
  expect(await readQueue(page)).toHaveLength(1);
});

test('#10 a submit 422 clears the row and the server card reads "Rejected" with its reason', async ({
  open,
}) => {
  const { page } = await openUploads(open, {
    server: {
      submit: {
        status: HTTP_UNPROCESSABLE,
        body: refusal('precheck_failed', {
          reasons: ['stale_capture'],
          submissionId: String(STALE.id),
        }),
      },
    },
    list: (filter, record) =>
      uploadsOf(ofFilter(filter, submitted(record) ? [STALE, ...THREE] : THREE)),
  });

  await page.getByRole('button', { name: 'Upload now' }).click();
  await expect(localCard(page)).toHaveCount(0);
  await expect(
    page.locator('.pl-reason', { hasText: /^Uploaded more than 72 hours after recording/u }),
  ).toBeVisible();
  expect(await readQueue(page)).toHaveLength(0);
});

test('#11 the list is asked again every 2 to 5 s while an item is checking, and stops when none is', async ({
  open,
}) => {
  let moving = true;
  const { page, lists } = await openUploads(open, {
    local: false,
    list: (filter) =>
      uploadsOf(ofFilter(filter, [moving ? CHECKING : ONCHAIN]), {
        all: 1,
        sent: 1,
        rejected: 0,
      }),
  });

  await expect(cards(page)).toHaveCount(1);

  const first = lists.length;

  await expect.poll(() => lists.length, { timeout: POLL_WINDOW_MS }).toBeGreaterThan(first);
  moving = false;
  await expect(cards(page).locator('.badge')).toHaveText('On-chain', { timeout: POLL_WINDOW_MS });

  const settled = lists.length;

  await settle(page, QUIET_MS);
  expect(lists).toHaveLength(settled);
});

test('#12 with nothing local and nothing sent, "No recordings yet" links to my trees', async ({
  open,
}) => {
  const { page } = await openUploads(open, {
    local: false,
    list: () => uploadsOf([], { all: 0, sent: 0, rejected: 0 }),
  });

  await expect(page.locator('.ws-empty h2')).toHaveText('No recordings yet');
  await expect(page.getByRole('link', { name: 'Go to my trees' })).toHaveAttribute(
    'href',
    '/app/planter/trees',
  );
  await expect(cards(page)).toHaveCount(0);
});
