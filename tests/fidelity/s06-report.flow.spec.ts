// docs/FE/features/s06-report.md §7: one test per acceptance criterion #1..#16, asserting its Then column under the
// fidelity.md §2 conditions (Asia/Jakarta, frozen clock, reduced motion). The page is public, so no login is needed
// except for #9; the API answers are the reports.md examples, served with page.route (the backend does not run).
import type { Page } from '@playwright/test';
import { errorBody, stubApi, type Answer, type Calls } from './helpers/api-report';
import { ALEX } from './fixtures/shell-accounts';
import {
  ADDRESS,
  CURSOR,
  FIRST_PAGE,
  FUNDING_REPORT,
  MANGROVES_CARBON,
  REPORT,
  SECOND_PAGE,
  UNKNOWN_ADDRESS,
} from './fixtures/report';
import { expect, signedInAt, test, type OpenOptions, type Opened } from './helpers/flow';
import { VIEWPORTS } from './matrix';

const WIDE = VIEWPORTS[1];
const PHONE = VIEWPORTS[0];
const ROW = 'S06';
const PATH = `/campaigns/${ADDRESS}/report`;
const HTTP_UNAVAILABLE = 503;
const HTTP_BAD_REQUEST = 400;
const SKELETON_MS = 300;
const TEST_MS = 120_000;
// the first visit makes the dev server compile the page's chunks
const FIRST_PAINT_MS = 30_000;
const DATE = new Date('2026-10-23T09:12:31.000Z');

test.describe.configure({ timeout: TEST_MS });

type Bodies = { report?: unknown; evidence?: () => { status?: number; body: unknown } };

/** Answers the report (and its evidence pages) as reports.md says; any other campaign is unknown. */
const answers =
  ({ report = REPORT, evidence }: Bodies = {}): Answer =>
  (url) => {
    if (url.pathname === `/api/v1/reports/campaign/${ADDRESS}`) {
      return { body: { report } };
    }

    if (url.pathname === `/api/v1/reports/campaign/${ADDRESS}/evidence` && evidence) {
      return evidence();
    }

    return undefined;
  };

const withCarbon = (carbon: unknown) => ({ ...REPORT, carbon });

const opened = async (
  open: (options?: OpenOptions) => Promise<Opened>,
  bodies: Bodies = {},
  viewport: (typeof VIEWPORTS)[number] = WIDE,
): Promise<{ page: Page; calls: Calls }> => {
  const { page } = await open({ row: ROW, viewport });
  const calls = await stubApi(page, answers(bodies));

  await page.goto(PATH);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: FIRST_PAINT_MS });

  return { page, calls };
};

const section = (page: Page, title: string) =>
  page
    .locator('section.rp-section')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });

const metric = (scope: ReturnType<typeof section>, label: string) =>
  scope.locator('.rp-metric').filter({ hasText: label });

const ledger = (page: Page, label: string) =>
  page.locator('.rp-ledger > div').filter({ hasText: label }).locator('dd');

const evidenceRows = (page: Page) =>
  page.getByRole('table', { name: 'Evidence record' }).locator('tbody tr');

test('S06 #1 the report shows the heading, badge, title, place, as-of date and the back link', async ({
  open,
}) => {
  const { page } = await opened(open);

  await expect(page.getByText('CAMPAIGN IMPACT REPORT')).toBeVisible();
  await expect(page.locator('.rp-heading .badge')).toHaveText('Active');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Roots that stay');
  await expect(page.locator('.rp-heading p')).toHaveText('Banyumas, Central Java · Mahogany');
  await expect(page.locator('.rp-snapshot')).toContainText('As of 21 Oct 2026 UTC');
  await expect(page.locator('.rp-snapshot')).toContainText('Campaign-wide totals');
  await expect(page.getByRole('link', { name: 'Back to campaign' })).toHaveAttribute(
    'href',
    `/campaigns/${ADDRESS}`,
  );
});

test('S06 #2 the overview scenes read the planting and the money figures', async ({ open }) => {
  const { page } = await opened(open);
  const trees = page.getByRole('img', { name: /trees planted/ });
  const money = page.getByRole('img', { name: /USDC raised/ });

  for (const text of ['984', 'OF 1,200 PLANTED', '96.5%', 'SURVIVAL', '2', 'FLAGGED']) {
    await expect(trees).toContainText(text);
  }

  for (const text of [
    '18,000',
    'USDC RAISED',
    '120',
    'CONTRIBUTORS',
    '2,100',
    'USDC TO PLANTERS',
  ]) {
    await expect(money).toContainText(text);
  }
});

test('S06 #3 tree health lists every status and the average age', async ({ open }) => {
  const { page } = await opened(open);
  const counts = { alive: '948', flagged: '2', dead: '20', removed: '14', completed: '0' };

  for (const [kind, count] of Object.entries(counts)) {
    const row = page.locator(`.pc-health dl .${kind}`);

    await expect(row.locator('dt')).toHaveText(kind[0]!.toUpperCase() + kind.slice(1));
    await expect(row.locator('dd')).toHaveText(count);
  }

  await expect(section(page, 'Tree health')).toContainText('Average age 186 days');
});

test('S06 #4 funding shows the raised total, the ledger and a full progress bar', async ({
  open,
}) => {
  const { page } = await opened(open);
  const funding = section(page, 'Funding');

  await expect(metric(funding, 'Total raised')).toContainText('18,000');
  await expect(metric(funding, 'Total raised')).toContainText('USDC');
  await expect(ledger(page, 'Funding target')).toHaveText('18,000 USDC');
  await expect(ledger(page, 'Unique contributors')).toHaveText('120');
  await expect(ledger(page, 'Total refunded')).toHaveText('0 USDC');
  await expect(ledger(page, 'Commitment')).toHaveText('36 months');
  await expect(ledger(page, 'Planting radius')).toHaveText('2,500 m');
  await expect(funding.getByRole('progressbar', { name: 'Funding' })).toHaveAttribute(
    'aria-valuenow',
    '100',
  );
});

const BARS = [
  ['1,033.2', 'M0', '984 paid'],
  ['1,033.2', 'M3', '984 paid'],
  ['33.6', 'M6', '32 paid'],
  [null, 'M12', 'upcoming'],
  [null, 'M24', 'upcoming'],
  [null, 'M36', 'upcoming'],
] as const;

/** M0, M3 and M6 carry a bar, an amount and the payouts paid; M12, M24 and M36 are outlines waiting. */
const expectBars = async (incentives: ReturnType<typeof section>): Promise<void> => {
  const columns = incentives.locator('.rp-bars svg g.rise');

  await expect(columns).toHaveCount(BARS.length);

  for (const [index, [amount, month, paid]] of BARS.entries()) {
    await expect(columns.nth(index)).toContainText(month);
    await expect(columns.nth(index)).toContainText(paid);

    if (amount !== null) {
      await expect(columns.nth(index)).toContainText(amount);
    }
  }
};

test('S06 #5 planter incentives show the gauge, the paid and forfeited figures and the bars', async ({
  open,
}) => {
  const { page } = await opened(open);
  const incentives = section(page, 'Planter incentives');

  await expect(incentives.locator('.pc-gauge')).toContainText('17%');
  await expect(metric(incentives, 'Paid')).toContainText('2,100');
  await expect(metric(incentives, 'Paid')).toContainText('USDC');
  await expect(metric(incentives, 'Forfeited')).toContainText('68');
  await expect(metric(incentives, 'Forfeited')).toContainText('USDC');
  await expectBars(incentives);
});

test('S06 #6 carbon shows the estimate apart from issuance, no funnel and the empty state', async ({
  open,
}) => {
  const { page } = await opened(open);
  const carbon = section(page, 'Carbon');

  await expect(metric(carbon, 'Campaign estimate')).toContainText('8.005');
  await expect(metric(carbon, 'Campaign estimate')).toContainText('tCO₂e');
  await expect(carbon.getByText('8,005 units. Estimates are not issued credits.')).toBeVisible();
  await expect(metric(carbon, 'Total issued')).toContainText('0.000');
  await expect(metric(carbon, 'Retired')).toContainText('0.000');
  await expect(
    carbon.getByText('0 issued units · 0 retired units. 1,000 units = 1 tCO₂e.'),
  ).toBeVisible();
  await expect(carbon.locator('.rp-funnel')).toHaveCount(0);
  await expect(carbon.getByText('No carbon has been issued.')).toBeVisible();
});

test('S06 #7 issued carbon shows the funnel and the first batch row with its link', async ({
  open,
}) => {
  const { page } = await opened(open, { report: withCarbon(MANGROVES_CARBON) });
  const carbon = section(page, 'Carbon');
  const first = carbon.getByRole('table', { name: 'Issuance batches' }).locator('tbody tr').first();

  await expect(metric(carbon, 'Campaign estimate')).toContainText('20.000');
  await expect(metric(carbon, 'Total issued')).toContainText('22.000');
  await expect(metric(carbon, 'Total issued')).toContainText('tCO₂e');
  await expect(metric(carbon, 'Retired')).toContainText('0.400');
  await expect(
    carbon.getByText('22,000 issued units · 400 retired units. 1,000 units = 1 tCO₂e.'),
  ).toBeVisible();
  await expect(carbon.locator('.rp-funnel')).toBeVisible();
  await expect(first.locator('td').nth(0)).toHaveText('#101 · SRN PPI');
  await expect(first.locator('td').nth(1)).toHaveText('2025');
  await expect(first.locator('td').nth(2)).toHaveText('SRN-2025-00001 / SRN-2025-16000');
  await expect(first.locator('td').nth(3)).toHaveText('16.000');
  await expect(first.getByRole('link', { name: '#101 · SRN PPI' })).toHaveAttribute(
    'href',
    '/carbon/101',
  );
});

test('S06 #8 a signed-out viewer in Asia/Jakarta sees three evidence rows and no roster note', async ({
  open,
}) => {
  const { page } = await opened(open);
  const cells = evidenceRows(page).first().locator('td');

  await expect(evidenceRows(page)).toHaveCount(3);
  await expect(cells.nth(0)).toHaveText('#3001');
  await expect(cells.nth(1)).toHaveText('Tree planted');
  await expect(cells.nth(2)).toHaveText('18 Apr 2026, 12:00 GMT+7');
  await expect(cells.nth(3)).toHaveText('0x70e9…0ba8');
  await expect(cells.nth(4)).toContainText('24118402');
  await expect(cells.nth(0).getByRole('link')).toHaveAttribute('href', '/trees/3001');
  await expect(page.getByText('This is not a complete tree roster.')).toHaveCount(0);
});

test('S06 #9 signed in, the roster note shows', async ({ open }) => {
  const { page } = await open({ row: ROW, viewport: WIDE });

  await stubApi(page, answers());
  await signedInAt(page, ALEX, PATH);

  await expect(page.getByText('This is not a complete tree roster.')).toBeVisible();
});

test('S06 #10 a Funding campaign shows the dash, the mutually exclusive note and the empty states', async ({
  open,
}) => {
  const { page } = await opened(open, { report: FUNDING_REPORT });

  await expect(page.getByRole('img', { name: /trees planted/ })).toContainText('—');
  await expect(section(page, 'Tree health')).toContainText('Mutually exclusive statuses');
  await expect(page.locator('.pc-forest')).toHaveCount(0);
  await expect(page.getByText('No milestone payouts yet.')).toBeVisible();
  await expect(page.getByText('No public evidence available.')).toBeVisible();
});

test('S06 #11 a 503 shows the unavailable state and no figure', async ({ open }) => {
  const { page } = await open({ row: ROW, viewport: WIDE });

  await stubApi(page, () => ({
    status: HTTP_UNAVAILABLE,
    body: errorBody('service_unavailable'),
  }));
  await page.goto(PATH);

  const alert = page.getByRole('alert');

  await expect(alert).toContainText('Report unavailable');
  await expect(alert).toContainText('Campaign totals could not be loaded.');
  await expect(alert.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByText('0 USDC')).toHaveCount(0);
  await expect(page.getByText('USDC', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
});

test('S06 #12 an unknown campaign shows Report not found with a link to all campaigns', async ({
  open,
}) => {
  const { page } = await open({ row: ROW, viewport: WIDE });

  await stubApi(page, () => ({ status: 404, body: errorBody('not_found') }));
  await page.goto(`/campaigns/${UNKNOWN_ADDRESS}/report`);

  await expect(page.getByRole('heading', { name: 'Report not found' })).toBeVisible();
  await expect(page.getByText('This campaign is not in the catalog.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'All campaigns' })).toHaveAttribute(
    'href',
    '/campaigns',
  );
});

test('S06 #13 load more sends the cursor and appends rows; an invalid cursor keeps them and alerts', async ({
  open,
}) => {
  let reply: { status?: number; body: unknown } = { body: SECOND_PAGE };
  const { page, calls } = await opened(open, {
    report: { ...REPORT, evidence: FIRST_PAGE },
    evidence: () => reply,
  });
  const more = page.getByTestId('evidence-more');

  await expect(evidenceRows(page)).toHaveCount(1);
  await more.click();
  await expect(evidenceRows(page)).toHaveCount(3);
  expect(
    calls.to(/\/evidence\?/).map((request) => new URL(request.url()).searchParams.get('cursor')),
  ).toEqual([CURSOR]);

  reply = { status: HTTP_BAD_REQUEST, body: errorBody('invalid_cursor') };
  await page.reload();
  await expect(evidenceRows(page)).toHaveCount(1);
  await page.getByTestId('evidence-more').click();

  const alert = page.getByTestId('evidence-more-error');

  await expect(alert).toHaveAttribute('role', 'alert');
  await expect(evidenceRows(page)).toHaveCount(1);
});

test('S06 #14 at 360 px the page does not scroll sideways and the evidence table scrolls in its wrapper', async ({
  open,
}) => {
  const { page } = await opened(open, {}, PHONE);
  const wrapper = page
    .locator('.rp-table-wrap')
    .filter({ has: page.getByRole('table', { name: 'Evidence record' }) });

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    PHONE.width,
  );
  expect(
    await wrapper.evaluate((element) => element.scrollWidth - element.clientWidth),
  ).toBeGreaterThan(0);
  expect(await wrapper.evaluate((element) => getComputedStyle(element).overflowX)).toMatch(
    /auto|scroll/,
  );
});

test('S06 #15 an estimate method shows one line under the estimate; none without it', async ({
  open,
}) => {
  const method = { model: 'linear-maturity-v1' };
  const estimate = { ...REPORT.carbon.estimate, method };
  const { page } = await opened(open, {
    report: withCarbon({ ...REPORT.carbon, estimate }),
  });
  const first = section(page, 'Carbon').locator('.rp-carbon > div').first();

  await expect(page.getByText('linear-maturity-v1')).toHaveCount(1);
  await expect(first.locator('.rp-note').first()).toHaveText('Method · linear-maturity-v1');
  await expect(first.locator('[data-copy="COPY-420"]')).toBeVisible();

  const none = await opened(open);

  await expect(none.page.getByText('linear-maturity-v1')).toHaveCount(0);
  await expect(none.page.locator('[data-copy="COPY-420"]')).toHaveCount(0);
});

/** No title and no figure: nothing of the report shows yet. */
const expectNoFigure = async (page: Page): Promise<void> => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
  await expect(page.getByText('USDC', { exact: false })).toHaveCount(0);
};

/** The report request stays pending until the returned function is called. */
const holdReport = async (page: Page): Promise<() => void> => {
  let release = (): void => undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });

  await stubApi(page, (url, request) => ({ ...answers()(url, request)!, after: pending }));

  return release;
};

test('S06 #16 (FG-09) the loading line shows at once and the skeleton blocks only after 300 ms', async ({
  open,
}) => {
  const { page } = await open({ row: ROW, viewport: WIDE });
  const release = await holdReport(page);

  // time stands still until the spec moves it, so "before 300 ms" cannot be overtaken by a slow machine
  await page.clock.pauseAt(new Date(DATE.getTime() + 1));
  await page.goto(PATH);

  const loading = page.getByRole('status').filter({ hasText: 'Loading impact report…' });

  await expect(loading).toBeVisible();
  await expect(loading).toHaveAttribute('aria-busy', 'true');
  await expectNoFigure(page);
  await expect(page.locator('.rp-loading .skeleton')).toHaveCount(0);

  await page.clock.runFor(SKELETON_MS - 1);
  await expect(page.locator('.rp-loading .skeleton')).toHaveCount(0);
  await page.clock.runFor(2);
  await expect(page.locator('.rp-loading .skeleton').first()).toBeVisible();
  await expectNoFigure(page);
  release();
});
