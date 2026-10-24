// Page openers of the UI-gap state tests on S03 to S06 (states.spec.ts): each opens the screen's row with the API stubbed.
import { expect, type Locator, type Page, type Route } from '@playwright/test';
import { SPECIES, campaignBody, listOf, type Json } from '../fixtures/campaigns';
import { ADDRESS, REPORT } from '../fixtures/report';
import { TREE_3001 } from '../fixtures/tree';
import { VIEWPORTS } from '../matrix';
import { answerApi } from './api';
import { stubApi } from './api-report';
import type { Opened, OpenOptions } from './flow';

const THUMB_ROUTE = '**/keyframes/**';

const WIDE = VIEWPORTS[1];

const EVIDENCE_TABLE = 'Evidence record';

const REPORT_PATH = `/api/v1/reports/campaign/${ADDRESS}`;

export type Open = (options?: OpenOptions) => Promise<Opened>;

export type Size = (typeof VIEWPORTS)[number];

export const expectNoSideScroll = async (page: Page, size: Size): Promise<void> => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    size.width,
  );
};

/** S03 with `items` as the whole catalog. */
export const catalogPage = async (open: Open, items: Json[], size: Size = WIDE): Promise<Page> => {
  const { page } = await open({ row: 'S03', viewport: size });

  await answerApi(page, (call) => ({ body: call.path === '/species' ? SPECIES : listOf(items) }));
  await page.goto('/campaigns');
  await expect(page.locator('.campaign-card')).toHaveCount(items.length);

  return page;
};

/** S04 on `campaign`, seen by `viewer` (null: signed out). */
export const campaignPage = async (
  open: Open,
  campaign: Json,
  viewer: Json | null = null,
  size: Size = WIDE,
): Promise<Page> => {
  const { page } = await open({ row: 'S04', viewport: size });

  await answerApi(page, () => ({ body: campaignBody(campaign, viewer) }));
  await page.goto(`/campaigns/${String(campaign.address)}`);
  await page.getByRole('heading', { level: 1 }).waitFor();

  return page;
};

/** S05 on the tree `body` describes. */
export const treePage = async (
  open: Open,
  body: { tree: { treeId: string } },
  size: Size = WIDE,
): Promise<Page> => {
  const { page } = await open({ row: 'S05', viewport: size });

  await stubApi(page, () => ({ body }));
  await page.goto(`/trees/${body.tree.treeId}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  return page;
};

/** S06 on `report`; the evidence pages answer `evidence`, which may hold its answer back (`after`). */
export const reportPage = async (
  open: Open,
  report: object = REPORT,
  size: Size = WIDE,
  evidence?: { body: unknown; after: Promise<unknown> },
): Promise<Page> => {
  const { page } = await open({ row: 'S06', viewport: size });

  await stubApi(page, (url) => {
    if (url.pathname === `${REPORT_PATH}/evidence`) {
      return evidence;
    }

    return url.pathname === REPORT_PATH ? { body: { report } } : undefined;
  });
  await page.goto(`/campaigns/${ADDRESS}/report`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  return page;
};

export const reportWith = (campaign: object, rest: object = {}) => ({
  ...REPORT,
  campaign: { ...REPORT.campaign, ...campaign },
  ...rest,
});

export const treeWith = (campaign: object, rest: object = {}) => ({
  ...TREE_3001,
  tree: { ...TREE_3001.tree, campaign: { ...TREE_3001.tree.campaign, ...campaign } },
  ...rest,
});

export const styleOf = (link: Locator) =>
  link.evaluate((element) => {
    const { fontStyle, color, fontWeight } = getComputedStyle(element);

    return [fontStyle, color, fontWeight].join('|');
  });

export const evidenceRows = (page: Page) =>
  page.getByRole('table', { name: EVIDENCE_TABLE }).locator('tbody tr');

/** S05 on tree 3001 with the thumbnail request answered by `handler`. */
export const thumbnailPage = async (
  open: Open,
  handler: (route: Route) => Promise<void>,
): Promise<Page> => {
  const { page } = await open({ row: 'S05', viewport: WIDE });

  await page.route(THUMB_ROUTE, handler);
  await stubApi(page, () => ({ body: TREE_3001 }));
  await page.goto('/trees/3001');
  await expect(page.locator('.ws-timeline > li')).toHaveCount(TREE_3001.timeline.length);

  return page;
};
