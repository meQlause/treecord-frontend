// docs/phases.md F1b: "UI-gap states reached on S07-S09: long content (16), null value (17), offline (14)". The same
// shape as the S03-S06 tests of states.spec.ts, in a file of their own (that one is at its line limit). The pages are
// public and the API is stubbed, so nobody signs in; each pattern reaches its drawn state through what the network
// answers (page.route) and through setOffline, never a `?state=` switch.
import type { Page } from '@playwright/test';
import type { Json } from './fixtures/campaigns';
import { BATCHES, BATCH_101, batchesOf } from './fixtures/carbon';
import { retirement } from './fixtures/retirement';
import { answerApi } from './helpers/api';
import { expect, test, type OpenOptions } from './helpers/flow';
import { VIEWPORTS } from './matrix';

const WIDE = VIEWPORTS[1];
const PHONE = VIEWPORTS[0];
const TITLE_MAX = 120;
const LONG_WORD = 'W'.repeat(TITLE_MAX);
const LONG_WORDS = 'A very long batch title that keeps going and going '
  .repeat(3)
  .slice(0, TITLE_MAX);
const LONG_NAME = `${'PT Hijau Lestari '.repeat(6)}${'PTHijauLestari'.repeat(6)}`;
const LONG_PURPOSE = 'Offsetting the scope three emissions of every flight we booked. '.repeat(5);
const OFFLINE = 'Offline · showing saved data. Network actions are unavailable.';
const CLAMP_LINES = '2';
const LINE_CLAMP = '-webkit-line-clamp';
const NOT_AVAILABLE = 'Not available yet';

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

type Size = (typeof VIEWPORTS)[number];

const withCampaign = (batch: Json, changes: Json): Json => ({
  ...batch,
  campaign: { ...(batch.campaign as Json), ...changes },
});

type Screen = { row: string; path: string; body: Json; size: Size };

/** Opens `path` on `row` with every carbon read answered by `body`, and waits for the page heading. */
const screen = async (open: Open, { row, path, body, size }: Screen): Promise<Page> => {
  const { page } = await open({ row, viewport: size });

  await answerApi(page, () => ({ body }));
  await page.goto(path);
  await page.getByRole('heading', { level: 1 }).waitFor();

  return page;
};

const catalog = (open: Open, items: Json[], size: Size = WIDE) =>
  screen(open, { row: 'S07', path: '/carbon', body: batchesOf(items), size });

const batch = (open: Open, body: Json, size: Size = WIDE) =>
  screen(open, { row: 'S08', path: '/carbon/101', body, size });

const certificate = (open: Open, body: Json, size: Size = WIDE) =>
  screen(open, { row: 'S09', path: '/carbon/retirements/1', body, size });

const expectNoSideScroll = async (page: Page, size: Size): Promise<void> => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    size.width,
  );
};

const styleOf = (page: Page, selector: string) =>
  page.locator(selector).evaluate((element) => {
    const { fontStyle, color, fontWeight } = getComputedStyle(element);

    return [fontStyle, color, fontWeight].join('|');
  });

const fits = (page: Page, selector: string) =>
  page.locator(selector).evaluate((element) => element.scrollWidth <= element.clientWidth);

const record = (page: Page, label: string) =>
  page.locator('.cb-cert dl > div').filter({ has: page.getByText(label, { exact: true }) });

/** Goes offline and waits for the info banner; a public page keeps what it showed (pattern 14). */
const goOffline = async (page: Page): Promise<void> => {
  await page.context().setOffline(true);
  await expect(page.locator('.app-state .state-banner')).toContainText(OFFLINE);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
};

const comeBack = async (page: Page): Promise<void> => {
  await page.context().setOffline(false);
  await expect(page.locator('.app-state')).toHaveCount(0);
};

test('pattern 16 long content S07: a 120-character title clamps to 2 lines with its full text in title, a long region wraps', async ({
  open,
}) => {
  const long = withCampaign(BATCH_101, { title: LONG_WORDS, region: LONG_WORD });
  const page = await catalog(open, [long, ...BATCHES.slice(0, 1)], PHONE);
  const card = page.locator('.cb-batch-card').first();
  const heading = card.locator('h2');

  await expect(heading).toHaveAttribute('title', LONG_WORDS);
  await expect(heading).toHaveCSS(LINE_CLAMP, CLAMP_LINES);
  expect(await heading.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
    true,
  );
  await expect(card.locator('.location')).toHaveClass(/wrap-any/);
  await expect(card.locator('.location')).toHaveText(LONG_WORD);
  await expectNoSideScroll(page, PHONE);
});

test('pattern 16 long content S08: a long title, region, species and "Campaign" fact wrap at 360 px, never cut', async ({
  open,
}) => {
  const long = withCampaign(BATCH_101, {
    title: LONG_WORD,
    region: LONG_WORD,
    species: { code: 'X', name: LONG_WORD },
  });
  const page = await batch(open, long, PHONE);

  await expect(page.locator('.cb-provenance h2')).toHaveText(LONG_WORD);
  await expect(page.locator('.cb-provenance .location')).toHaveText(LONG_WORD);
  await expect(page.locator('.cb-prov-meta')).toContainText(LONG_WORD);
  await expect(record(page, 'Campaign').locator('dd')).toHaveText(LONG_WORD);
  await expectNoSideScroll(page, PHONE);
  expect(await fits(page, '.cb-provenance h2')).toBe(true);
  expect(await fits(page, '.cb-prov-meta')).toBe(true);
});

test('pattern 16 long content S09: a long beneficiary and purpose wrap in the certificate and the stock card at 360 px', async ({
  open,
}) => {
  const page = await certificate(
    open,
    retirement({ beneficiary: LONG_NAME, purpose: LONG_PURPOSE }),
    PHONE,
  );

  await expect(page.locator('.rc-name')).toHaveText(LONG_NAME);
  await expect(page.locator('.rc-purpose')).toContainText(LONG_PURPOSE.trim());
  await expect(page.locator('.cb-stock-card .cw-label')).toHaveText(`For ${LONG_NAME}`);
  await expectNoSideScroll(page, PHONE);
  expect(await fits(page, '.rc-name')).toBe(true);
  expect(await fits(page, '.cb-stock-card .cw-label')).toBe(true);
});

test('pattern 17 null value S08: a batch without an issue time shows "Not available yet" styled like the other facts', async ({
  open,
}) => {
  const page = await batch(open, { ...BATCH_101, issuedAt: null });
  const issued = record(page, 'Issued on').locator('dd');

  await expect(issued).toHaveText(NOT_AVAILABLE);
  expect(await issued.evaluate((element) => getComputedStyle(element).fontStyle)).toBe(
    await record(page, 'Vintage')
      .locator('dd')
      .evaluate((element) => getComputedStyle(element).fontStyle),
  );
});

test('pattern 17 null value S09: a retirement without a purpose shows "No purpose given" styled like a real purpose', async ({
  open,
}) => {
  const real = await certificate(open, retirement());
  const realStyle = await styleOf(real, '.rc-purpose');
  const page = await certificate(open, retirement({ purpose: null }));

  await expect(page.locator('.rc-purpose')).toHaveText('No purpose given');
  expect(await styleOf(page, '.rc-purpose')).toBe(realStyle);
});

test('pattern 14 offline S07: the saved batches stay under the info banner with the filters disabled', async ({
  open,
}) => {
  const page = await catalog(open, BATCHES);

  await expect(page.locator('.cb-batch-card')).toHaveCount(BATCHES.length);
  await goOffline(page);
  await expect(page.locator('.cb-batch-card')).toHaveCount(BATCHES.length);
  await expect(page.locator('fieldset.ws-state-body')).toHaveJSProperty('disabled', true);
  await expect(page.getByRole('button', { name: 'Sold out', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Filter by registry')).toBeDisabled();
  await comeBack(page);
});

test('pattern 14 offline S08: the saved batch stays under the info banner with the buy panel disabled', async ({
  open,
}) => {
  const page = await batch(open, BATCH_101);

  await goOffline(page);
  await expect(page.locator('.cb-provenance h2')).toHaveText('Back to the mangroves');
  await expect(page.locator('fieldset.ws-state-body')).toHaveJSProperty('disabled', true);
  await expect(page.locator('.cb-buy').getByRole('button', { name: 'Buy credits' })).toBeDisabled();
  await comeBack(page);
});

test('pattern 14 offline S09: the saved record stays under the info banner, and copy and print still work', async ({
  open,
}) => {
  const page = await certificate(open, retirement());

  await page.context().setOffline(true);
  await expect(page.locator('.app-state .state-banner')).toContainText(OFFLINE);
  await expect(page.locator('.rc-cert .rc-amount')).toContainText('0.500');
  await expect(page.getByRole('button', { name: 'Copy record link' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Print certificate' })).toBeEnabled();
  await comeBack(page);
});
