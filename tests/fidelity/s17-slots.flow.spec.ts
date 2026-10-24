// docs/FE/features/s17-slots.md §7: one test per criterion #1..#6, in the browser, under the docs/FE/fidelity.md §2
// conditions. Sign-in uses the real Privy test account (backend/.env); `GET /me` follows the profile the spec holds and
// `GET /planter/slots` is answered with the planter.md §2 body (the backend does not run).
import type { Page } from '@playwright/test';
import { qrPath } from '../../src/shared/art/qrcode';
import { SARI } from './fixtures/accounts';
import { SLOT_41, SLOT_42, slotsOf } from './fixtures/planter';
import { expect, test, type OpenOptions } from './helpers/flow';
import { answerPlanter, type PlanterResponder } from './helpers/planter';
import { openSignedIn } from './helpers/signed-in';

const ROW = 'S17';
const PATH = '/app/planter/slots';
const CAMPAIGN = '0x0000000000000000000000000000000000000003';
const TAG = 'TC-B2YK-5ZWN';
const TEST_MS = 120_000;

test.describe.configure({ timeout: TEST_MS });

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

/** Signs in as Sari and opens S17, `answer` replying to the one read of the slots. */
const openSlots = async (open: Open, answer: PlanterResponder): Promise<Page> => {
  const { page } = await openSignedIn(open, { row: ROW, profile: SARI, path: PATH }, (target) =>
    answerPlanter(target, answer, []),
  );

  return page;
};

const fixture: PlanterResponder = () => ({ body: slotsOf([SLOT_41, SLOT_42]) });

const cardOf = (page: Page, slotId: string) =>
  page
    .locator('.campaign-card')
    .filter({ has: page.getByRole('link', { name: `Slot #${slotId}` }) });

test('#1 the fixture reads "2 slots" and slot 41 shows its badge, kind, campaign, species, radius and tag', async ({
  open,
}) => {
  const page = await openSlots(open, fixture);
  const card = cardOf(page, '41');

  await expect(page.locator('.results-meta')).toContainText('2 slots');
  await expect(card.locator('.badge')).toHaveText('Claimed');
  await expect(card).toContainText('Open slot');
  await expect(card).toContainText('Roots that stay');
  await expect(card.locator('.funding-row')).toContainText('Mahogany');
  await expect(card.locator('.funding-row')).toContainText('to plant');
  await expect(card.locator('.funding-row')).toContainText('2,500 m');
  await expect(card.locator('.card-meta')).toContainText(`Tag ${TAG}`);
});

test('#2 "Assigned" shows only slot 42, is pressed and the meta reads "1 slots of 2"', async ({
  open,
}) => {
  const page = await openSlots(open, fixture);

  await page.getByRole('button', { name: 'Assigned', exact: true }).click();

  await expect(page.locator('.campaign-card')).toHaveCount(1);
  await expect(cardOf(page, '42').locator('.badge')).toHaveText('Assigned');
  await expect(cardOf(page, '42')).toContainText('Anchor slot');
  await expect(page.getByRole('button', { name: 'Assigned', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.results-meta')).toContainText('1 slots of 2');
});

test('#3 "Print tag" downloads the tag as a 50 mm SVG carrying the code, the slot line and the QR', async ({
  open,
}) => {
  const page = await openSlots(open, fixture);
  const download = page.waitForEvent('download');

  await cardOf(page, '41').getByRole('link', { name: 'Print tag' }).click();

  const file = await download;
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }

  const svg = Buffer.concat(chunks).toString('utf8');

  expect(file.suggestedFilename()).toBe(`${TAG}.svg`);
  expect(svg).toContain('width="50mm"');
  expect(svg).toContain('Slot #41 · Roots that stay');
  expect(svg).toContain(`>${TAG}<`);
  expect(svg).toContain(qrPath(TAG).d);
});

test('#4 "Record planting" opens the capture of that slot in its campaign', async ({ open }) => {
  const page = await openSlots(open, fixture);

  await expect(cardOf(page, '41').getByRole('link', { name: 'Record planting' })).toHaveAttribute(
    'href',
    `/app/planter/record?campaign=${CAMPAIGN}&slot=41&kind=PLANTED`,
  );
});

test('#5 with no slots, "No unplanted slots" offers "Browse campaigns"', async ({ open }) => {
  const page = await openSlots(open, () => ({ body: slotsOf([]) }));

  await expect(page.locator('main')).toContainText('No unplanted slots');
  await expect(page.getByRole('link', { name: 'Browse campaigns' })).toHaveAttribute(
    'href',
    '/campaigns',
  );
});

test('#6 the card art carries the QR of the tag with its name', async ({ open }) => {
  const page = await openSlots(open, fixture);

  // the art link is hidden from assistive tech (the title link beside it says the same), so the name is read off the SVG
  await expect(cardOf(page, '41').locator(`svg[aria-label="QR code ${TAG}"]`)).toHaveCount(1);
});
