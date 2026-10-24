// docs/FE/features/s16-my-trees.md §7: one test per criterion #1..#8, in the browser, under the docs/FE/fidelity.md §2
// conditions (UTC for this row). Sign-in uses the real Privy test account (backend/.env); `GET /me` follows the profile
// the spec holds and `GET /planter/trees` is answered with the planter.md §1 bodies (the backend does not run).
import type { Page } from '@playwright/test';
import { SARI } from './fixtures/accounts';
import type { Json } from './fixtures/campaigns';
import {
  HELD_ID,
  PHONE,
  SUMMARY,
  TREE_3001,
  deadTree,
  flaggedTree,
  heldTree,
  treesOf,
} from './fixtures/planter';
import { expect, test, type OpenOptions } from './helpers/flow';
import { answerPlanter, seedDeviceId, type PlanterResponder } from './helpers/planter';
import { openSignedIn } from './helpers/signed-in';

const ROW = 'S16';
const PATH = '/app/planter/trees';
const HTTP_FORBIDDEN = 403;
const TEST_MS = 120_000;
const NO_TREES: Json = {
  ...SUMMARY,
  treeCount: 0,
  survivalPct: null,
  flaggedCount: 0,
  openCheckIns: 0,
};

test.describe.configure({ timeout: TEST_MS });

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

type Opened = { page: Page; calls: URL[] };

/** Signs in as Sari and opens S16, `answer` replying to every read of the list; `phone` is the device id seeded locally. */
const openTrees = async (open: Open, answer: PlanterResponder, phone?: string): Promise<Opened> => {
  const calls: URL[] = [];
  const { page } = await openSignedIn(
    open,
    { row: ROW, profile: SARI, path: PATH },
    async (target) => {
      if (phone !== undefined) {
        await seedDeviceId(target, SARI.id, phone);
      }

      await answerPlanter(target, answer, calls);
    },
  );

  return { page, calls };
};

const listing =
  (...items: Json[]): PlanterResponder =>
  () => ({ body: treesOf(items) });

const cardOf = (page: Page, treeId: string) =>
  page
    .locator('.campaign-card')
    .filter({ has: page.getByRole('link', { name: `Tree #${treeId}` }) });

const meta = (page: Page) => page.locator('.results-meta');

test('#1 the overview reads the totals and the note says how many check-ins are open', async ({
  open,
}) => {
  const { page } = await openTrees(open, listing(TREE_3001));
  const duo = page.locator('.pl-duo');

  for (const [value, caption] of [
    ['8', 'TREES IN YOUR CARE'],
    ['62.5', 'SURVIVAL'],
    ['2', 'FLAGGED'],
    ['84', 'USDC SET ASIDE'],
    ['25.2', 'USDC PAID TO YOU'],
  ]) {
    await expect(duo).toContainText(value ?? '');
    await expect(duo).toContainText(caption ?? '');
  }

  await expect(meta(page)).toContainText('2 check-ins open now');
});

test('#2 with no trees at all there is no overview, and "No matching trees" offers "View slots"', async ({
  open,
}) => {
  const { page } = await openTrees(open, () => ({ body: treesOf([], { summary: NO_TREES }) }));
  const empty = page.locator('.empty-state, .ws-empty');

  await expect(page.locator('.pl-duo')).toHaveCount(0);
  await expect(empty).toContainText('No matching trees');
  await expect(empty.getByRole('link', { name: 'View slots' })).toHaveAttribute(
    'href',
    '/app/planter/slots',
  );
});

test('#3 tree 3001 shows its badge, place, campaign, next payout, progress, window and two actions', async ({
  open,
}) => {
  const { page } = await openTrees(open, listing(TREE_3001));
  const card = cardOf(page, '3001');

  await expect(card.locator('.badge')).toHaveText('Alive');
  await expect(card).toContainText('Mahogany');
  await expect(card).toContainText('Banyumas, Central Java');
  await expect(card).toContainText('Roots that stay');
  await expect(card.locator('.funding-row')).toContainText('Month 6');
  await expect(card.locator('.funding-row')).toContainText('1.05 USDC next');
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
  await expect(card.locator('.card-meta')).toContainText('Window open until 14 Nov 2026');
  await expect(card.getByRole('link', { name: 'Record check-in' })).toHaveAttribute(
    'href',
    '/app/planter/record?tree=3001&kind=ALIVE',
  );
  await expect(card.getByRole('link', { name: 'Report dead' })).toHaveAttribute(
    'href',
    '/app/planter/record?tree=3001&kind=DEAD',
  );
});

test('#4 a check-in held for review opens its evidence, and says whether it came from this phone', async ({
  open,
}) => {
  const { page } = await openTrees(open, listing(heldTree()), PHONE);
  const card = cardOf(page, '3104');

  await expect(card.getByRole('link', { name: 'Month 6 check-in in review' })).toHaveAttribute(
    'href',
    `/app/evidence/${HELD_ID}`,
  );
  await expect(card.locator('.card-meta')).toContainText(
    'Submitted from this phone · needs review',
  );

  const other = await openTrees(open, listing(heldTree()));

  await expect(cardOf(other.page, '3104').locator('.card-meta')).toContainText(
    'Submitted · needs review',
  );
  await expect(cardOf(other.page, '3104').locator('.card-meta')).not.toContainText(
    'from this phone',
  );
});

test('#5 a flagged tree is paused: the funding row, the meta, "View tree" only, no "Report dead"', async ({
  open,
}) => {
  const { page } = await openTrees(open, listing(flaggedTree));
  const card = cardOf(page, '3092');

  await expect(card.locator('.funding-row')).toContainText('Paused at month 6');
  await expect(card.locator('.funding-row')).toContainText('until the flag is resolved');
  await expect(card.locator('.card-meta')).toContainText('Payouts and clock paused');
  await expect(card.getByRole('link', { name: 'View tree' })).toBeVisible();
  await expect(card.getByRole('link', { name: 'Report dead' })).toHaveCount(0);
});

test('#6 a dead tree can be replanted: "Replant by" and "Record replant"', async ({ open }) => {
  const { page } = await openTrees(open, listing(deadTree));
  const card = cardOf(page, '3050');

  await expect(card.locator('.card-meta')).toContainText('Replant by 4 Nov 2026');
  await expect(card.getByRole('link', { name: 'Record replant' })).toHaveAttribute(
    'href',
    '/app/planter/record?tree=3050&kind=REPLANTED',
  );
});

test('#7 pressing "Alive" asks for status=alive, is pressed and the meta reads "5 trees of 8"', async ({
  open,
}) => {
  const alive = Array.from({ length: 5 }, (_item, index) => ({
    ...TREE_3001,
    treeId: `300${index + 1}`,
  }));
  const { page, calls } = await openTrees(open, ({ url }) => ({
    body:
      url.searchParams.get('status') === 'alive'
        ? treesOf(alive, { total: 5 })
        : treesOf([TREE_3001, flaggedTree], { total: 8 }),
  }));

  await page.getByRole('button', { name: 'Alive', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Alive', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(meta(page)).toContainText('5 trees of 8');
  expect(calls.some((url) => url.searchParams.get('status') === 'alive')).toBe(true);
});

test('#8 a wallet not ready says so, and "Try again" repeats only the read', async ({ open }) => {
  const { page, calls } = await openTrees(open, () => ({
    status: HTTP_FORBIDDEN,
    body: { error: { code: 'wallet_missing', message: 'wallet_missing' } },
  }));
  const callout = page.getByRole('alert');

  await expect(callout).toContainText(
    'Your wallet is still being prepared. Try again in a moment.',
  );
  await callout.getByRole('button', { name: 'Try again' }).click();
  await expect.poll(() => calls.length).toBe(2);
});
