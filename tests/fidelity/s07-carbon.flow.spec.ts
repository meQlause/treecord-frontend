// docs/FE/features/s07-carbon.md §7: one test per criterion #1..#13, in the browser, under the docs/FE/fidelity.md §2
// conditions. The backend does not run: `GET /carbon/batches` is answered with the carbon.md §1 examples by page.route
// (helpers/api.ts). The page is public, so nobody signs in.
import type { Page } from '@playwright/test';
import { BATCHES, batchesOf } from './fixtures/carbon';
import { answerApi, failure, type ApiAnswer, type ApiCall } from './helpers/api';
import { expect, test, type OpenOptions } from './helpers/flow';
import { VIEWPORTS } from './matrix';

const ROW = 'S07';
const WIDE = VIEWPORTS[1];
const CARD = '.cb-batch-card';
const HTTP_UNAVAILABLE = 503;

type Responder = (call: ApiCall) => ApiAnswer | Promise<ApiAnswer>;

type Opened = { page: Page; calls: ApiCall[] };

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

/** Opens `/carbon` with `list` answering `GET /carbon/batches`; `calls` is every request to the API so far. */
const visit = async (open: Open, list: Responder): Promise<Opened> => {
  const { page } = await open({ row: ROW, viewport: WIDE });
  const calls = await answerApi(page, list);

  await page.goto('/carbon');

  return { page, calls };
};

const fixture = (): Responder => () => ({ body: batchesOf(BATCHES) });

const cardOf = (page: Page, batchId: string) =>
  page.locator(CARD).filter({ has: page.getByText(`Batch #${batchId}`, { exact: true }) });

const meta = (page: Page) => page.locator('.results-meta');

const tab = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test('#1 the first card is batch #102, the second #101, and the meta reads "5 batches" with "Newest first"', async ({
  open,
}) => {
  const { page } = await visit(open, fixture());

  await expect(page.locator(CARD)).toHaveCount(BATCHES.length);
  await expect(page.locator(CARD).nth(0)).toContainText('Batch #102');
  await expect(page.locator(CARD).nth(1)).toContainText('Batch #101');
  await expect(meta(page)).toContainText('5 batches');
  await expect(meta(page)).toContainText('Newest first');
});

test('#2 batch 101 shows its place, title, registry, vintage, inventory, share, issued total and price', async ({
  open,
}) => {
  const { page } = await visit(open, fixture());
  const card = cardOf(page, '101');

  await expect(card).toContainText('Cilacap, Central Java');
  await expect(card.getByRole('heading', { name: 'Back to the mangroves' })).toBeVisible();
  await expect(card).toContainText('SRN PPI');
  await expect(card).toContainText('Vintage 2025');
  await expect(card).toContainText('8.400 tCO₂e available');
  await expect(card.locator('.funding-row')).toContainText('53%');
  await expect(card.getByRole('progressbar', { name: 'Inventory available' })).toHaveAttribute(
    'aria-valuenow',
    '53',
  );
  await expect(card).toContainText('of 16.000 tCO₂e issued');
  await expect(card).toContainText('18.5 USDC / tonne');
  await expect(card.locator('.badge')).toHaveText('Issued');
});

test('#3 batch 103 reads "17 USDC / tonne · Sold out", 104 "Sales paused" and 105 "Price not set"', async ({
  open,
}) => {
  const { page } = await visit(open, fixture());

  await expect(cardOf(page, '103').locator('.card-meta')).toContainText(
    '17 USDC / tonne · Sold out',
  );
  await expect(cardOf(page, '104').locator('.card-meta')).toContainText('Sales paused');
  await expect(cardOf(page, '105').locator('.card-meta')).toContainText('Price not set');
});

test('#4 "Sold out" shows one card, is pressed, and the meta reads "1 batches of 5" with "Clear filters"', async ({
  open,
}) => {
  const { page } = await visit(open, fixture());

  await tab(page, 'Sold out').click();

  await expect(page.locator(CARD)).toHaveCount(1);
  await expect(cardOf(page, '103')).toBeVisible();
  await expect(tab(page, 'Sold out')).toHaveAttribute('aria-pressed', 'true');
  await expect(meta(page)).toContainText('1 batches of 5');
  await expect(meta(page).getByRole('button', { name: 'Clear filters' })).toBeVisible();
});

test('#5 "Clear filters" brings the five cards back and "Newest first" returns', async ({
  open,
}) => {
  const { page } = await visit(open, fixture());

  await tab(page, 'Sold out').click();
  await meta(page).getByRole('button', { name: 'Clear filters' }).click();

  await expect(page.locator(CARD)).toHaveCount(BATCHES.length);
  await expect(meta(page)).toContainText('Newest first');
});

test('#6 typing "mangrove" keeps the matching cards, and "Clear search" empties the field', async ({
  open,
}) => {
  const { page } = await visit(open, fixture());
  const field = page.getByLabel('Filter by campaign or region');

  await field.fill('MANGROVE');

  await expect(page.locator(CARD)).toHaveCount(2);
  await expect(page.locator(CARD).filter({ hasText: 'Back to the mangroves' })).toHaveCount(2);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(field).toHaveValue('');
  await expect(page.locator(CARD)).toHaveCount(BATCHES.length);
});

test('#7 registry "Verra" with "Available" leaves only batch #102', async ({ open }) => {
  const { page } = await visit(open, fixture());

  await page.getByLabel('Filter by registry').selectOption('Verra');
  await tab(page, 'Available').click();

  await expect(page.locator(CARD)).toHaveCount(1);
  await expect(cardOf(page, '102')).toBeVisible();
});

test('#8 filters that match nothing say so and offer a "Clear filters" button', async ({
  open,
}) => {
  const { page } = await visit(open, fixture());

  await tab(page, 'Sold out').click();
  await page.getByLabel('Filter by registry').selectOption('Verra');

  const empty = page.locator('.empty-state');

  await expect(empty).toContainText('No batches match these filters');
  await expect(empty.getByRole('button', { name: 'Clear filters' })).toBeVisible();
});

test('#9 "View batch" on #101 opens /carbon/101', async ({ open }) => {
  const { page } = await visit(open, fixture());

  await cardOf(page, '101')
    .getByRole('link', { name: /^View batch 101:/ })
    .click();

  await expect(page).toHaveURL(/\/carbon\/101$/);
});

test('#10 while the request is pending: the loading line over three skeletons, busy, no amount', async ({
  open,
}) => {
  let release = (): void => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const { page } = await visit(open, async () => {
    await gate;

    return { body: batchesOf(BATCHES) };
  });
  const loading = page.locator('.cb-catalog [aria-busy="true"]');

  await expect(loading).toContainText('Loading issued batches…');
  await expect(loading.locator('.skeleton-card')).toHaveCount(3);
  await expect(page.locator('.cb-catalog')).not.toContainText(/tCO₂e|USDC/);
  release();
});

test('#11 an empty list says "No issued batches yet"', async ({ open }) => {
  const { page } = await visit(open, () => ({ body: batchesOf([]) }));

  await expect(page.locator('.empty-state')).toContainText('No issued batches yet');
});

test('#12 a 503 shows an alert with "Try again", which asks for the list again', async ({
  open,
}) => {
  const { page, calls } = await visit(open, () => failure(HTTP_UNAVAILABLE, 'service_unavailable'));
  const alert = page.getByRole('alert');

  await expect(alert).toContainText('Couldn’t load carbon credits');
  expect(calls).toHaveLength(1);
  await alert.getByRole('button', { name: 'Try again' }).click();
  await expect.poll(() => calls.length).toBe(2);
});

test('#13 the one request is GET /carbon/batches?limit=100 without Authorization, and filtering sends no other', async ({
  open,
}) => {
  const { page, calls } = await visit(open, fixture());

  await expect(page.locator(CARD)).toHaveCount(BATCHES.length);
  await tab(page, 'Available').click();
  await page.getByLabel('Filter by registry').selectOption('Verra');
  await page.getByLabel('Filter by campaign or region').fill('forest');
  await expect(page.locator(CARD)).toHaveCount(1);
  expect(calls).toHaveLength(1);
  expect(calls[0]?.method).toBe('GET');
  expect(calls[0]?.path).toBe('/carbon/batches');
  expect(calls[0]?.params.get('limit')).toBe('100');
  expect(calls[0]?.headers.authorization).toBeUndefined();
});
