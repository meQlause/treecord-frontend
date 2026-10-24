// docs/FE/features/s03-campaigns.md §7: one test per criterion #1..#18, in the browser, under the docs/FE/fidelity.md §2
// conditions. The backend does not run: `GET /species` and `GET /campaigns` are answered with the campaigns.md §1
// examples by page.route (helpers/api.ts). The page is public, so nobody signs in.
import type { Page } from '@playwright/test';
import { DEMAK_ITEM, SENGON_ITEM, SPECIES, item, listOf, type Json } from './fixtures/campaigns';
import { answerApi, failure, type ApiAnswer, type ApiCall } from './helpers/api';
import { expect, settle, test, type OpenOptions } from './helpers/flow';
import { VIEWPORTS } from './matrix';

const ROW = 'S03';
const WIDE = VIEWPORTS[1];
const PHONE = VIEWPORTS[0];
const CURSOR = 'eyJiIjoiMjkxMDQ0ODAifQ';
const CARD = '.campaign-card';
const UNAVAILABLE = 'service_unavailable';
const HTTP_UNAVAILABLE = 503;
const HTTP_BAD_REQUEST = 400;

type Responder = (call: ApiCall) => ApiAnswer | Promise<ApiAnswer>;

/** `GET /species` as campaigns.md §3; every `GET /campaigns` goes to `list`. */
const catalog =
  (list: Responder): Responder =>
  (call) => {
    if (call.path === '/species') {
      return { body: SPECIES };
    }

    return call.path === '/campaigns' ? list(call) : failure(HTTP_BAD_REQUEST, 'invalid_path');
  };

type Opened = { page: Page; calls: ApiCall[] };

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

/** Opens `url` with `list` answering the catalog; `calls` is every request to the API so far. */
const visit = async (open: Open, url: string, list: Responder): Promise<Opened> => {
  const { page } = await open({ row: ROW, viewport: WIDE });
  const calls = await answerApi(page, catalog(list));

  await page.goto(url);

  return { page, calls };
};

const lists = (calls: ApiCall[]): ApiCall[] => calls.filter((call) => call.path === '/campaigns');

const cardOf = (page: Page, title: string) => page.locator(CARD).filter({ hasText: title });

const meta = (page: Page) => page.locator('.results-meta');

const tab = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

const THREE = [
  DEMAK_ITEM,
  SENGON_ITEM,
  item({ address: '0x0000000000000000000000000000000000000004' }),
];

test('#1 the Demak card shows its species, place, title, size, funding, percent, target and days left', async ({
  open,
}) => {
  const { page } = await visit(open, '/campaigns', () => ({
    body: listOf([DEMAK_ITEM, SENGON_ITEM]),
  }));
  const card = cardOf(page, 'A new tide for Demak');

  await expect(card).toContainText('Funding');
  await expect(card).toContainText('Rhizophora mangrove');
  await expect(card).toContainText('Demak, Central Java');
  await expect(card.getByRole('heading', { name: 'A new tide for Demak' })).toBeVisible();
  await expect(card.locator('.tree-target')).toHaveText(/1,000\s*trees\s*·\s*36 months/);
  await expect(card.locator('.funding-row')).toHaveText(/6,840\s*USDC\s*68%/);
  await expect(card).toContainText('of 10,000 USDC');
  await expect(card).toContainText('18 days left');
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '68');
});

test('#2 the Sengon card rounds 5250 basis points to 53% and shows 24 days left', async ({
  open,
}) => {
  const { page } = await visit(open, '/campaigns', () => ({
    body: listOf([DEMAK_ITEM, SENGON_ITEM]),
  }));
  const card = cardOf(page, 'Room for a forest');

  await expect(card.locator('.funding-row')).toHaveText(/4,200\s*USDC\s*53%/);
  await expect(card).toContainText('of 8,000 USDC');
  await expect(card).toContainText('24 days left');
});

test('#3 ?status=Funding asks for funding without a limit, reads "2 campaigns of 7" and offers Load more', async ({
  open,
}) => {
  const { page, calls } = await visit(open, '/campaigns?status=Funding', () => ({
    body: listOf([DEMAK_ITEM, SENGON_ITEM], 7, CURSOR),
  }));

  await expect(meta(page)).toContainText('2 campaigns of 7');
  await expect(page.locator('.load-more')).toContainText('2 of 7 campaigns');
  await expect(page.getByRole('button', { name: 'Load more campaigns' })).toBeVisible();
  const [first] = lists(calls);

  expect(first?.params.get('status')).toBe('funding');
  expect(first?.params.has('limit')).toBe(false);
});

test('#4 without a next cursor there is no Load more button', async ({ open }) => {
  const { page } = await visit(open, '/campaigns', () => ({
    body: listOf([DEMAK_ITEM, SENGON_ITEM]),
  }));

  await expect(page.locator(CARD)).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Load more campaigns' })).toHaveCount(0);
});

test('#5 a failed next page keeps the first cards and "Try again" resends the same cursor', async ({
  open,
}) => {
  const { page, calls } = await visit(open, '/campaigns', (call) =>
    call.params.has('cursor')
      ? failure(HTTP_UNAVAILABLE, UNAVAILABLE)
      : { body: listOf([DEMAK_ITEM, SENGON_ITEM], 7, CURSOR) },
  );

  await page.getByRole('button', { name: 'Load more campaigns' }).click();

  const alert = page.getByRole('alert');

  await expect(alert).toHaveText(/Couldn’t load more\. Your campaigns are still here\./);
  await expect(page.locator(CARD)).toHaveCount(2);
  await alert.getByRole('button', { name: 'Try again' }).click();
  await expect.poll(() => lists(calls).length).toBe(3);
  expect(lists(calls).map((call) => call.params.get('cursor'))).toEqual([null, CURSOR, CURSOR]);
});

test('#6 a funding campaign past its deadline keeps the Funding badge and reads "Deadline passed"', async ({
  open,
}) => {
  const waiting = item({
    title: 'Waiting on the rain',
    daysLeft: null,
    fundingDeadlinePassed: true,
  });
  const { page } = await visit(open, '/campaigns', () => ({ body: listOf([waiting]) }));
  const card = cardOf(page, 'Waiting on the rain');

  await expect(card.locator('.badge')).toHaveText('Funding');
  await expect(card.locator('.card-meta')).toContainText('Deadline passed');
});

test('#7 active, completed and refunding campaigns read their own meta line', async ({ open }) => {
  const metas: [string, string][] = [
    ['active', 'Growing now'],
    ['completed', 'Commitment complete'],
    ['refunding', 'Funding ended'],
  ];
  const items = metas.map(([status], index) =>
    item({
      status,
      title: `Campaign ${status}`,
      address: `0x00000000000000000000000000000000000000a${index}`,
    }),
  );
  const { page } = await visit(open, '/campaigns', () => ({ body: listOf(items) }));

  for (const [status, line] of metas) {
    await expect(cardOf(page, `Campaign ${status}`).locator('.card-meta')).toContainText(line);
  }
});

test('#8 ?status=Active&species=Sengon asks for active Sengon and shows both in the controls', async ({
  open,
}) => {
  const { page, calls } = await visit(open, '/campaigns?status=Active&species=Sengon', () => ({
    body: listOf([SENGON_ITEM]),
  }));

  await expect(page.locator(CARD)).toHaveCount(1);
  const [first] = lists(calls);

  expect(first?.params.get('status')).toBe('active');
  expect(first?.params.get('species')).toBe('FALCATARIA_FALCATA');
  await expect(tab(page, 'Active')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Filter by species')).toHaveValue('Sengon');
});

test('#9 "Clear filters" leaves /campaigns with every control back at its default', async ({
  open,
}) => {
  const { page } = await visit(open, '/campaigns?status=Active&species=Sengon&region=java', () => ({
    body: listOf([SENGON_ITEM]),
  }));

  await expect(page.locator(CARD)).toHaveCount(1);
  await meta(page).getByRole('button', { name: 'Clear filters' }).click();

  await expect(page).toHaveURL(/\/campaigns$/);
  await expect(tab(page, 'All campaigns')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Filter by species').locator('option:checked')).toHaveText(
    'All species',
  );
  await expect(page.getByLabel('Filter by region')).toHaveValue('');
});

test('#10 "Clear region" removes ?region and asks again without it', async ({ open }) => {
  const { page, calls } = await visit(open, '/campaigns', () => ({
    body: listOf([DEMAK_ITEM]),
  }));

  await page.getByLabel('Filter by region').fill('java');
  await expect(page).toHaveURL(/region=java/);
  await expect
    .poll(() => lists(calls).some((call) => call.params.get('region') === 'java'))
    .toBe(true);
  const before = lists(calls).length;

  await page.getByRole('button', { name: 'Clear region' }).click();

  await expect(page).not.toHaveURL(/region/);
  await expect.poll(() => lists(calls).length).toBeGreaterThan(before);
  expect(lists(calls).at(-1)?.params.has('region')).toBe(false);
});

test('#11 an unknown ?status falls back to All campaigns and is not sent', async ({ open }) => {
  const { page, calls } = await visit(open, '/campaigns?status=Paused', () => ({
    body: listOf([DEMAK_ITEM]),
  }));

  await expect(page.locator(CARD)).toHaveCount(1);
  await expect(tab(page, 'All campaigns')).toHaveAttribute('aria-pressed', 'true');
  expect(lists(calls).every((call) => !call.params.has('status'))).toBe(true);
});

test('#12 while the list is pending: six skeleton cards, the finding line and no amount', async ({
  open,
}) => {
  let release = (): void => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const { page } = await visit(open, '/campaigns', async () => {
    await gate;

    return { body: listOf([DEMAK_ITEM]) };
  });

  await expect(page.locator('.skeleton-card')).toHaveCount(6);
  await expect(meta(page)).toContainText('Finding your next forest…');
  await expect(page.locator('.campaign-grid')).not.toContainText(/USDC/);
  release();
});

test('#13 an empty catalog says the next forest starts here, with no button', async ({ open }) => {
  const { page } = await visit(open, '/campaigns', () => ({ body: listOf([]) }));
  const empty = page.locator('.empty-state');

  await expect(empty).toContainText('The next forest starts here');
  await expect(empty).toContainText('No campaigns to show yet.');
  await expect(empty.getByRole('button')).toHaveCount(0);
});

test('#14 an empty answer for ?species=Durian says no matching campaigns and offers Clear filters', async ({
  open,
}) => {
  const { page } = await visit(open, '/campaigns?species=Durian', () => ({
    body: listOf([]),
  }));
  const empty = page.locator('.empty-state');

  await expect(empty).toContainText('No matching campaigns');
  await expect(empty.getByRole('button', { name: 'Clear filters' })).toBeVisible();
});

test('#15 a 503 shows the hiccup, no card, and "Try again" sends exactly one new request', async ({
  open,
}) => {
  const { page, calls } = await visit(open, '/campaigns', () =>
    failure(HTTP_UNAVAILABLE, UNAVAILABLE),
  );
  const empty = page.locator('.empty-state');

  await expect(empty).toContainText('Couldn’t load campaigns');
  await expect(empty).toContainText('Please try again.');
  await expect(meta(page)).toContainText('Campaigns unavailable');
  await expect(page.locator(CARD)).toHaveCount(0);
  expect(lists(calls)).toHaveLength(1);
  await empty.getByRole('button', { name: 'Try again' }).click();
  await settle(page);
  expect(lists(calls)).toHaveLength(2);
});

test('#16 offline shows the cached cards under a banner; Refresh back online toasts', async ({
  open,
}) => {
  const { page } = await visit(open, '/campaigns', () => ({
    body: listOf(THREE),
  }));

  await expect(page.locator(CARD)).toHaveCount(THREE.length);
  await page.context().setOffline(true);
  const banner = page.locator('.state-banner');

  await expect(banner).toContainText('You’re offline · Showing cached campaigns');
  await expect(page.locator(CARD)).toHaveCount(THREE.length);
  await page.context().setOffline(false);
  await banner.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.locator('.toast')).toContainText('Campaigns refreshed');
  await expect(banner).toHaveCount(0);
});

test('#17 a campaign without a title still has a non-empty title link', async ({ open }) => {
  const untitled: Json = item({ title: null });
  const { page } = await visit(open, '/campaigns', () => ({ body: listOf([untitled]) }));

  await expect(page.getByTestId('campaign-title')).toHaveText(/\S/);
});

test('#18 at 360 px the page does not scroll sideways', async ({ open }) => {
  const { page } = await open({ row: ROW, viewport: PHONE });

  await answerApi(
    page,
    catalog(() => ({ body: listOf([DEMAK_ITEM, SENGON_ITEM]) })),
  );
  await page.goto('/campaigns');

  await expect(page.locator(CARD)).toHaveCount(2);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);

  expect(width).toBeLessThanOrEqual(PHONE.width);
});
