// docs/FE/features/s04-campaign.md §7, the read half: one test per criterion that uses none of D04 Contribute, Start
// refund, D05 Claim refund or D06 Claim slots, titled with its number. The backend does not run: `GET /campaigns/:address`
// is answered with the campaigns.md §2 example (and its variants) by page.route (helpers/api.ts); the `viewer` object in
// that answer is what makes a page "signed in", so nobody logs in. FG-01 (budget chart hover / focus) is criterion #36.
//
// Left for F2b / F4a (they drive a wallet, the chain or the claim job): #7 #8 #9 #10 #11 #12 #13 #14 #15 #16 (D04),
// #18 #19 (Start refund), #21 #22 #23 #25 (D05), #26 #27 #28 #29 #30 #31 (D06). #24 only checks that D05 is absent.
import type { Locator, Page } from '@playwright/test';
import {
  ALEX_VIEWER,
  DEMAK,
  DEMAK_DETAIL,
  DEWI_VIEWER,
  MISSING,
  RAKA_VIEWER,
  ROOTS_DETAIL,
  campaignBody,
  detail,
  type Json,
} from './fixtures/campaigns';
import { answerApi, failure } from './helpers/api';
import { expect, test, type OpenOptions } from './helpers/flow';
import type { Viewport } from './fidelity.setup';
import { VIEWPORTS } from './matrix';

const ROW = 'S04';
const WIDE = VIEWPORTS[1];
const PHONE = VIEWPORTS[0];
const HTTP_NOT_FOUND = 404;
const ACTIONS = 'Campaign actions';
const READ_ONLY = 'Campaign read-only for this account.';
const OPEN_OPERATIONS = 'Open operations';
const START_REFUND = 'Start refund';

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

/** Opens the campaign at `address` signed out (`viewer: null`) or as `viewer`, answering with `campaign`. */
const visit = async (
  open: Open,
  campaign: Json,
  viewer: Json | null = null,
  viewport: Viewport = WIDE,
): Promise<Page> => {
  const { page } = await open({ row: ROW, viewport });
  const address = String(campaign.address);

  await answerApi(page, (call) =>
    call.path === `/campaigns/${address}`
      ? { body: campaignBody(campaign, viewer) }
      : failure(HTTP_NOT_FOUND, 'not_found'),
  );
  await page.goto(`/campaigns/${address}`);
  await page.getByRole('heading', { level: 1 }).waitFor();

  return page;
};

const panel = (page: Page) => page.locator('aside.funding-panel');

const actions = (page: Page) => page.locator('#campaign-actions');

const rowOf = (page: Page, name: string) =>
  page.locator('.budget-rows li').filter({ hasText: name });

test('#1 Demak signed out: hero, facts, ring, amount, days chip and both deadlines in Jakarta time', async ({
  open,
}) => {
  const page = await visit(open, DEMAK_DETAIL);
  const side = panel(page);
  const checks: [Locator, string | RegExp][] = [
    [page.locator('.detail-hero .badge'), 'Funding'],
    [page.locator('.detail-hero'), 'Rhizophora mangrove'],
    [page.locator('.detail-hero h1'), 'A new tide for Demak'],
    [page.locator('.detail-hero'), 'Demak, Central Java'],
    [page.locator('.fact-strip'), /Tree targets*1,000/],
    [page.locator('.fact-strip'), /Commitments*36 months/],
    [page.locator('.fact-strip'), /Region radiuss*2,500 m/],
    [page.locator('.fact-strip'), /Networks*Base Sepolia/],
    [side.locator('.ring-label'), /68%s*funded/],
    [side.locator('.large-amount'), /6,840s*USDC/],
    [side, 'raised of 10,000 USDC'],
    [side.locator('.days-chip'), '18 days left'],
    [side.locator('.funding-dates'), /Funding deadlines*10 Nov 2026/],
    [side.locator('.funding-dates'), /Claim deadlines*10 Dec 2026/],
  ];

  for (const [locator, expected] of checks) {
    await expect(locator.first()).toContainText(expected);
  }
});

test('#2 Demak: the funding budget lists five buckets of 10,000 USDC, and focusing one lights it', async ({
  open,
}) => {
  const page = await visit(open, DEMAK_DETAIL);
  const rows: [string, string, string][] = [
    ['Planter incentives', '70%', '7,000 USDC'],
    ['Seedlings', '10%', '1,000 USDC'],
    ['Verification', '5%', '500 USDC'],
    ['Replacement reserve', '10%', '1,000 USDC'],
    ['Platform fee', '5%', '500 USDC'],
  ];

  await expect(
    page.locator('.section-heading').filter({ hasText: 'Where the funding goes' }),
  ).toContainText('Of 10,000 USDC');

  for (const [name, share, amount] of rows) {
    await expect(rowOf(page, name)).toContainText(share);
    await expect(rowOf(page, name)).toContainText(amount);
  }

  await rowOf(page, 'Seedlings').focus();
  await expect(rowOf(page, 'Seedlings')).toHaveClass(/active/);
  await expect(page.locator('.budget-stack span.budget-1')).toHaveClass(/active/);
});

test('#3 any campaign: the track shows the six payouts and its label lists all six', async ({
  open,
}) => {
  const page = await visit(open, DEMAK_DETAIL);
  const stops: [string, string][] = [
    ['Plant', '10%'],
    ['M3', '10%'],
    ['M6', '10%'],
    ['M12', '15%'],
    ['M24', '15%'],
    ['M36', '40%'],
  ];

  await expect(page.locator('.track-stop')).toHaveCount(stops.length);

  for (const [index, [month, share]] of stops.entries()) {
    await expect(page.locator('.track-stop').nth(index).locator('.track-month')).toHaveText(month);
    await expect(page.locator('.track-stop').nth(index).locator('.track-share')).toHaveText(share);
  }

  await expect(page.locator('.milestone-track svg')).toHaveAttribute(
    'aria-label',
    'Six incentive payouts over 36 months: 10% at planting, 10% at month 3, 10% at month 6, 15% at month 12, 15% at month 24, 40% at month 36.',
  );
});

test('#4 Demak: the slot legend reads 250 / 750 / 0 and planting starts once funded', async ({
  open,
}) => {
  const page = await visit(open, DEMAK_DETAIL);
  const legend = page.locator('.plot-legend');

  await expect(legend).toContainText('Anchor slots250');
  await expect(legend).toContainText('Open allocation750');
  await expect(legend).toContainText('Planted0');
  await expect(
    page.locator('.section-heading').filter({ hasText: 'Planting overview' }),
  ).toContainText('Planting starts once funded');
});

test('#5 Demak: the amount chips preview the trees and what planters are paid', async ({
  open,
}) => {
  const page = await visit(open, DEMAK_DETAIL);
  const result = panel(page).locator('.cp-result');
  const chips = panel(page).getByRole('group', { name: 'Amount' });

  await chips.getByRole('button', { name: '100', exact: true }).click();
  await expect(result).toContainText('≈ 10 trees');
  await expect(result).toContainText('70 USDC paid to planters as the trees survive');
  await chips.getByRole('button', { name: '25', exact: true }).click();
  await expect(result).toContainText('≈ 2 trees');
  await expect(result).toContainText('17.5 USDC paid to planters as the trees survive');
});

test('#6 signed out: the call to action leads to sign-in with the way back, and there is no actions panel', async ({
  open,
}) => {
  const page = await visit(open, DEMAK_DETAIL);

  await expect(page.getByText(ACTIONS)).toHaveCount(0);
  await panel(page).getByRole('button', { name: 'Sign in to contribute 100 USDC' }).click();
  await expect(page).toHaveURL(`/sign-in?returnTo=%2Fcampaigns%2F${DEMAK}`);
});

test('#17 Roots that stay with Alex: funding is complete, 984 of 1,200 planted, no contribution field', async ({
  open,
}) => {
  const page = await visit(open, ROOTS_DETAIL, ALEX_VIEWER);

  await expect(panel(page).locator('.funding-ended')).toHaveText('Funding complete');
  await expect(panel(page).locator('.cp-result')).toContainText('984 of 1,200');
  await expect(panel(page).locator('.cp-result')).toContainText('trees verified in the field');
  await expect(page.getByLabel('Contribution · USDC')).toHaveCount(0);
  await expect(actions(page)).toContainText('Funding complete. Follow the campaign impact report.');
  await expect(panel(page).locator('.funding-dates')).toContainText('Claim deadline10 Dec 2026');
  await expect(panel(page).locator('.funding-dates')).not.toContainText('Claim deadlineClosed');
});

test('#20 Demak before its deadline: no signed-in viewer is offered Start refund', async ({
  open,
}) => {
  for (const viewer of [ALEX_VIEWER, RAKA_VIEWER, DEWI_VIEWER]) {
    const page = await visit(open, DEMAK_DETAIL, viewer);

    await expect(actions(page)).toBeVisible();
    await expect(page.getByRole('button', { name: START_REFUND })).toHaveCount(0);
  }
});

test('#24 a donor who gave nothing to a refunding campaign: no Claim refund, a read-only line', async ({
  open,
}) => {
  const refunding = detail({ status: 'refunding', daysLeft: null });
  const page = await visit(open, refunding, { ...ALEX_VIEWER, contributedAmount: '0' });

  await expect(actions(page)).toContainText(READ_ONLY);
  await expect(page.getByRole('button', { name: 'Claim refund' })).toHaveCount(0);
  await expect(panel(page).locator('.funding-ended')).toHaveText(
    'Refunds available to contributors',
  );
});

test('#32 Raka (operator) is sent to operations; Dewi (auditor) sees the campaign read-only', async ({
  open,
}) => {
  const raka = await visit(open, DEMAK_DETAIL, RAKA_VIEWER);

  await expect(raka.getByRole('button', { name: OPEN_OPERATIONS })).toBeVisible();
  await expect(actions(raka).getByRole('link', { name: OPEN_OPERATIONS })).toHaveAttribute(
    'href',
    `/app/operator/campaigns/${DEMAK}`,
  );

  const dewi = await visit(open, DEMAK_DETAIL, DEWI_VIEWER);

  await expect(dewi.getByRole('button', { name: 'See campaign actions' })).toBeVisible();
  await expect(actions(dewi)).toContainText(READ_ONLY);
});

test('#33 the copy button puts the address on the clipboard; a blocked clipboard shows the error toast', async ({
  open,
}) => {
  const allowed = await visit(open, DEMAK_DETAIL);

  await allowed.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await allowed.getByTitle('Copy full campaign address').click();
  await expect(allowed.locator('.toast')).toContainText('Campaign address copied');
  expect(await allowed.evaluate(() => navigator.clipboard.readText())).toBe(DEMAK);

  const { page: blocked } = await open({ row: ROW, viewport: WIDE });

  await blocked.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) },
    });
  });
  await answerApi(blocked, () => ({ body: campaignBody(DEMAK_DETAIL) }));
  await blocked.goto(`/campaigns/${DEMAK}`);
  await blocked.getByTitle('Copy full campaign address').click();
  await expect(blocked.locator('.toast-error')).toContainText(
    'Couldn’t copy. Select the address to copy it.',
  );
  await expect(blocked.locator('.full-address')).toBeVisible();
});

test('#34 an unknown campaign says so and offers the way back', async ({ open }) => {
  const { page } = await open({ row: ROW, viewport: WIDE });

  await answerApi(page, () => failure(HTTP_NOT_FOUND, 'not_found'));
  await page.goto(`/campaigns/${MISSING}`);

  await expect(page.getByRole('heading', { name: 'Campaign not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to campaigns' })).toHaveAttribute(
    'href',
    '/campaigns',
  );
  await expect(page).toHaveTitle('Not found · Treecord');
});

test('#35 at 360 px the page does not scroll sideways and the funding panel follows the content', async ({
  open,
}) => {
  const page = await visit(open, DEMAK_DETAIL, null, PHONE);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  const content = await page.locator('.detail-content').boundingBox();
  const aside = await panel(page).boundingBox();

  expect(width).toBeLessThanOrEqual(PHONE.width);
  expect(aside?.y).toBeGreaterThanOrEqual((content?.y ?? 0) + (content?.height ?? 0) - 1);
});

/** FG-01: exactly this row and this segment are lit, and the chart dims the rest. */
const expectOnlyLit = async (page: Page, name: string, segment: number): Promise<void> => {
  await expect(rowOf(page, name)).toHaveClass(/active/);
  await expect(page.locator('.budget-rows li.active')).toHaveCount(1);
  await expect(page.locator('.budget-stack span.active')).toHaveClass(
    new RegExp(`budget-${segment}\\b`),
  );
  await expect(page.locator('.budget-chart')).toHaveClass(/has-active/);
};

const expectNoneLit = async (page: Page): Promise<void> => {
  await expect(page.locator('.budget-rows li.active')).toHaveCount(0);
  await expect(page.locator('.budget-stack span.active')).toHaveCount(0);
  await expect(page.locator('.budget-chart')).not.toHaveClass(/has-active/);
};

test('#36 FG-01 pointing at a budget row or segment lights it and dims the rest; leaving clears it', async ({
  open,
}) => {
  const page = await visit(open, DEMAK_DETAIL);

  await expect(page.locator('.budget-chart')).toBeVisible();
  await rowOf(page, 'Verification').hover();
  await expectOnlyLit(page, 'Verification', 2);
  await page.locator('.budget-stack span.budget-1').hover();
  await expectOnlyLit(page, 'Seedlings', 1);
  await page.mouse.move(0, 0);
  await expectNoneLit(page);

  await rowOf(page, 'Platform fee').focus();
  await expectOnlyLit(page, 'Platform fee', 4);
  await rowOf(page, 'Platform fee').blur();
  await expectNoneLit(page);
});
