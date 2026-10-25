// docs/FE/features/s15-my-carbon.md §8, the reading half: #1-#8 and #19. Alex (or a planter) signs in through the real Privy
// test account; `GET /carbon/holdings` and its load-more page are answered with the carbon.md §3 body (the backend does
// not run). D09 and D10 (#9-#18, #20) are in s15-my-carbon-wallet.flow.spec.ts, on anvil.
import type { Locator, Page } from '@playwright/test';
import { HOLDINGS, PLANTER_HOLDINGS, page as listing, retiredItem } from './fixtures/holdings';
import { failure } from './helpers/api';
import { expect, test } from './helpers/flow';
import { PLANTER, openCarbon, type Scene } from './helpers/my-carbon-page';

const TEST_MS = 120_000;
const CURSOR = 'eyJiIjoiMjkxMDQ0ODAifQ';
const UNAVAILABLE = 503;

test.describe.configure({ timeout: TEST_MS });

const cards = (page: Page) => page.locator('.campaign-card');

const tab = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

const meta = (page: Page) => page.locator('.results-meta');

const figure = (page: Page, label: string): Locator =>
  page.locator('.mc-figures > div').filter({ has: page.getByText(label, { exact: true }) });

const read = (scene: Partial<Scene> = {}): Scene => ({ holdings: () => HOLDINGS, ...scene });

test('#1 no session: /app/carbon opens S02 with returnTo=/app/carbon', async ({ open }) => {
  const { page } = await open({ row: 'S15' });

  await page.goto('/app/carbon');
  await page.waitForURL(/\/sign-in\?/u);
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe('/app/carbon');
});

test('#2 pending holdings show the loading line with no figure; a 503 shows "Couldn’t load your carbon"', async ({
  open,
}) => {
  const gate = Promise.withResolvers<void>();
  const { page } = await openCarbon(
    open,
    read({ holdings: () => gate.promise.then(() => failure(UNAVAILABLE, 'service_unavailable')) }),
  );

  await expect(page.getByText('Loading carbon holdings…')).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'Loading carbon holdings…' }),
  ).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.mc-figures')).toHaveCount(0);
  gate.resolve();
  await expect(page.getByText('Couldn’t load your carbon')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('#3 the figures read 1.200 ready to retire, 0.933 not issued yet, 0.400 claimed for good', async ({
  open,
}) => {
  const { page } = await openCarbon(open, read());

  await expect(figure(page, 'Issued')).toContainText('1.200');
  await expect(figure(page, 'Issued')).toContainText('ready to retire');
  await expect(figure(page, 'Reserved')).toContainText('0.933');
  await expect(figure(page, 'Reserved')).toContainText('not issued yet');
  await expect(figure(page, 'Retired')).toContainText('0.400');
  await expect(figure(page, 'Retired')).toContainText('claimed for good');
});

test('#4 "Issued balances" is pressed and its card reads the batch, the share and the serials', async ({
  open,
}) => {
  const { page } = await openCarbon(open, read());
  const card = cards(page);

  await expect(tab(page, 'Issued balances')).toHaveAttribute('aria-pressed', 'true');
  await expect(meta(page)).toContainText('1 batch');
  await expect(meta(page)).toContainText('Only issued credits can be retired');
  await expect(card).toHaveCount(1);

  for (const text of [
    'Cilacap, Central Java',
    'Back to the mangroves',
    'SRN PPI',
    'Vintage 2025',
    'Batch #101',
    '1.200 tCO₂e to retire',
    '75%',
    '0.400 tCO₂e retired so far',
    'Serial 00001–16000',
  ]) {
    await expect(card).toContainText(text);
  }

  await expect(card.locator('h2 a')).toHaveAttribute('href', '/carbon/101');
});

test('#5 "Reservations": the mangroves card is 80% issued with 0.400 unfilled; Roots that stay has none issued', async ({
  open,
}) => {
  const { page } = await openCarbon(open, read());

  await tab(page, 'Reservations').click();
  await expect(meta(page)).toContainText('2 reservations');
  await expect(meta(page)).toContainText('Pre-certification, not issued');

  for (const text of [
    'Reserved',
    'Rhizophora mangrove',
    '2.000 tCO₂e reserved',
    'pre-certification',
    '1.600 tCO₂e issued to you',
    '80%',
    '0.400 tCO₂e unfilled',
    'Updated 18 Sept 2026',
  ]) {
    await expect(cards(page).first()).toContainText(text);
  }

  for (const text of [
    'Roots that stay',
    '0.533 tCO₂e reserved',
    '0.000 tCO₂e issued to you',
    '0%',
    '0.533 tCO₂e unfilled',
  ]) {
    await expect(cards(page).nth(1)).toContainText(text);
  }
});

test('#6 "Retirements": the card reads who it was for, the registry status, and links to the record', async ({
  open,
}) => {
  const { page } = await openCarbon(open, read());

  await tab(page, 'Retirements').click();
  await expect(meta(page)).toContainText('1 retirements');
  await expect(meta(page)).toContainText('Newest first');

  for (const text of [
    '20 Sept 2026',
    'For PT Hijau Lestari',
    '2026 scope 3 offset',
    '0.400 tCO₂e retired',
    'SRN PPI',
    'On-chain · confirmed',
    'Registry · Pending',
  ]) {
    await expect(cards(page)).toContainText(text);
  }

  await expect(page.getByRole('link', { name: 'View record' })).toHaveAttribute(
    'href',
    '/carbon/retirements/2',
  );
});

test('#7 a planter reads zero figures and three empty sections, each with "Explore credits"', async ({
  open,
}) => {
  const { page } = await openCarbon(
    open,
    read({ holdings: () => PLANTER_HOLDINGS, profile: PLANTER }),
  );
  const empty = [
    ['Issued balances', 'No issued balance', 'Only issued credits can be retired.'],
    ['Reservations', 'No reservations', 'Your campaign reservations will appear here.'],
    ['Retirements', 'No retirements yet', 'Retire issued credits to create a retirement record.'],
  ] as const;

  await expect(figure(page, 'Issued')).toContainText('0.000');

  for (const [name, title, text] of empty) {
    await tab(page, name).click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByText(text, { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore credits' })).toHaveAttribute(
      'href',
      '/carbon',
    );
  }
});

test('#8 "load more" asks for the next page with the cursor and appends it; a failed page keeps the cards and offers Try again', async ({
  open,
}) => {
  let asked = 0;
  const first = { ...HOLDINGS, retirements: listing([retiredItem('2')], 42, CURSOR) };
  const { page, calls } = await openCarbon(
    open,
    read({
      holdings: () => first,
      more: () => {
        asked += 1;

        return asked === 1
          ? failure(UNAVAILABLE, 'service_unavailable')
          : listing([retiredItem('1', '100')], 42);
      },
    }),
  );
  const more = page.getByRole('button').filter({ has: page.locator('[data-copy="COPY-353"]') });

  await tab(page, 'Retirements').click();
  await expect(meta(page)).toContainText('42 retirements');
  await more.click();
  await expect(page.locator('[data-copy="COPY-354"]')).toBeVisible();
  await expect(cards(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(cards(page)).toHaveCount(2);

  const [call] = calls.filter(({ path }) => path === '/carbon/holdings/retirements');

  expect(call?.params.get('cursor')).toBe(CURSOR);
  expect(call?.params.get('limit')).toBe('20');
});

test('#19 no Sell, Transfer or Withdraw control exists in any section', async ({ open }) => {
  const { page } = await openCarbon(open, read());
  const forbidden = /sell|transfer|withdraw/iu;

  for (const name of ['Issued balances', 'Reservations', 'Retirements']) {
    await tab(page, name).click();
    await expect(cards(page).first()).toBeVisible();
    await expect(page.getByRole('button', { name: forbidden })).toHaveCount(0);
    await expect(page.getByRole('link', { name: forbidden })).toHaveCount(0);
  }
});
