// docs/FE/features/s13-donor-home.md §7: one test per criterion #1..#16, in the browser, under the fidelity.md §2
// conditions. Sign-in uses the real Privy test account (backend/.env); `GET /me` follows the profile the spec holds and
// `GET /donor/dashboard` and `GET /donor/campaigns` are answered with the donor.md §1 and §2 bodies (no backend).
import type { Page } from '@playwright/test';
import { SARI, meBody, type MeProfile } from './fixtures/accounts';
import {
  CARDS,
  DASHBOARD,
  EMPTY_DASHBOARD,
  MANGROVES_CARD,
  ROOTS_CARD,
  cardsOf,
} from './fixtures/donor';
import type { Json } from './fixtures/campaigns';
import { expect, settle, signInWith, test, type OpenOptions } from './helpers/flow';
import { answerDonor, type DonorResponder } from './helpers/donor';
import { meFollows, type MeState } from './helpers/profile';
import { VIEWPORTS } from './matrix';

const ROW = 'S13';
const WIDE = VIEWPORTS[1];
const PHONE = VIEWPORTS[0];
const ALEX: MeProfile = {
  ...SARI,
  role: 'donor',
  displayName: 'Alex',
  walletAddress: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
  isBuyer: true,
  carbonRightsAgreementAccepted: false,
  carbonRightsAcceptedAt: null,
};
const HTTP_UNAVAILABLE = 503;
const HTTP_BAD_REQUEST = 400;
const SKELETON_MS = 300;
const TEST_MS = 120_000;
const CURSOR = 'eyJiIjoiMjkxMDQ0ODAifQ';

test.describe.configure({ timeout: TEST_MS });

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

type Opened = { page: Page; calls: URL[]; account: MeState };

type Size = (typeof VIEWPORTS)[number];

/** The default answer: the dashboard of §1 and every card of §2. */
const full: DonorResponder = ({ read }) => ({
  body: read === 'dashboard' ? DASHBOARD : cardsOf(CARDS),
});

/** Signs in as `profile` and opens `/app/donor` with `answer` replying to the two reads. */
const openDonor = async (
  open: Open,
  answer: DonorResponder = full,
  profile: MeProfile = ALEX,
  size: Size = WIDE,
): Promise<Opened> => {
  const { page } = await open({ row: ROW, viewport: size });
  const account: MeState = { current: profile };
  const calls: URL[] = [];

  await signInWith(page, meBody(profile), {
    returnTo: '/app/donor',
    setup: async (target) => {
      await meFollows(target, account);
      await answerDonor(target, answer, calls);
    },
  });
  await page.getByRole('button', { name: /^Continue to/ }).click();
  await page.waitForURL('**/app/donor');

  return { page, calls, account };
};

const cardOf = (page: Page, title: string) =>
  page.locator('.portfolio-card').filter({ has: page.getByRole('heading', { name: title }) });

const overview = (page: Page) => page.locator('.donor-duo');

const rail = (page: Page) => page.locator('.donor-insights');

const FIGURES: [string, string][] = [
  ['2,350', 'USDC CONTRIBUTED'],
  ['3', 'CAMPAIGNS'],
  ['8,225', 'USDC TO PLANTERS'],
  ['1,884', 'TREES PLANTED'],
  ['96.9%', 'SURVIVAL'],
  ['3', 'OPEN FLAGS'],
];

test('#1 the overview reads the giving and the trees figures of the dashboard', async ({
  open,
}) => {
  const { page } = await openDonor(open);

  for (const [value, caption] of FIGURES) {
    await expect(overview(page)).toContainText(value);
    await expect(overview(page)).toContainText(caption);
  }

  await expect(
    page.getByRole('img', {
      name: '2,350 USDC contributed to 3 campaigns; 8,225 USDC released to planters',
    }),
  ).toBeVisible();
});

test('#2 "Your carbon" reads the issued balance, the allocation and the unfilled reservation', async ({
  open,
}) => {
  const { page } = await openDonor(open);
  const wallet = rail(page).locator('.carbon-wallet');

  await expect(wallet).toContainText('Your carbon');
  await expect(wallet.locator('.cw-balance')).toHaveText(/1\.200\s*tCO₂e/);
  await expect(wallet.locator('.cw-allocation')).toContainText('Total allocated');
  await expect(wallet.locator('.cw-allocation')).toContainText('1.600');
  await expect(wallet.locator('.cw-reservation')).toContainText('Unfilled reservation');
  await expect(wallet.locator('.cw-reservation')).toContainText('Pre-certification');
  await expect(wallet.locator('.cw-reservation strong')).toHaveText(/0\.933\s*tCO₂e/);
  await expect(wallet.locator('.cw-note')).toHaveText('Reserved credits have not been issued.');
});

test('#3 the flags rail counts them, lists them newest first and opens #3103 with its pause line', async ({
  open,
}) => {
  const { page } = await openDonor(open);
  const flags = rail(page).locator('.flag-inbox');
  const items = flags.locator('.fi-item');

  await expect(flags.locator('h2')).toHaveText('Flags 3');
  await expect(flags.locator('.fi-counts')).toContainText('2 open');
  await expect(flags.locator('.fi-counts')).toContainText('1 pending');
  await expect(items.locator('.fi-identity strong')).toHaveText([
    'Tree #3103',
    'Tree #3092',
    'Tree #3091',
  ]);
  await expect(items.locator('.fi-identity small').first()).toHaveText('Roots that stay');
  await items.first().locator('summary').click();
  await expect(items.first()).toContainText(
    'Reason saved; wallet transaction has not been confirmed.',
  );
  await expect(items.first()).toContainText('Not on-chain · Payouts are not paused.');
  await expect(items.first().getByRole('link', { name: 'View tree' })).toHaveAttribute(
    'href',
    '/trees/3103',
  );
});

const DEMAK_TEXT = [
  'Funding',
  'Rhizophora mangrove',
  '250',
  '3.65% of funding raised',
  '68%',
  '6,840 USDC raised',
  'of 10,000',
  '1,000 trees planned · Not planted yet',
  'of the planter budget',
  '0 / 4,788 USDC',
  'Released to planters',
  'Refunded to you',
  'Not estimated yet',
  'No reservations or issued credits.',
];

test('#4 the Demak card shows its contribution, funding, no trees and no carbon yet', async ({
  open,
}) => {
  const { page } = await openDonor(open);
  const card = cardOf(page, 'A new tide for Demak');

  for (const text of DEMAK_TEXT) {
    await expect(card).toContainText(text);
  }

  await expect(card.getByText('Tree health')).toHaveCount(0);
  await expect(card.locator('.pc-gauge')).toContainText('0%');
});

const ROOTS_TEXT = [
  '1,200',
  '6.67% of funding raised',
  '100%',
  '18,000 USDC raised',
  'of 18,000',
  '984 / 1,200 trees planted',
  'Tree health',
  'one tree ≈ 25',
  '2,100 / 12,600 USDC',
  'Released to planters',
  '8.005 tCO₂e',
  '0.533 tCO₂e',
  '0.000 tCO₂e',
];

test('#5 the "Roots that stay" card shows its trees, health, funds and carbon', async ({
  open,
}) => {
  const { page } = await openDonor(open);
  const card = cardOf(page, 'Roots that stay');

  for (const text of ROOTS_TEXT) {
    await expect(card).toContainText(text);
  }

  await expect(card.locator('.pc-health dd')).toHaveText(['948', '2', '20', '14', '0']);
  await expect(card.locator('.pc-gauge')).toContainText('17%');
});

test('#6 the mangroves card shows its share, refund and carbon', async ({ open }) => {
  const { page } = await openDonor(open);
  const card = cardOf(page, 'Back to the mangroves');

  for (const text of [
    '10.00% of funding raised',
    '6,125 / 6,300 USDC',
    '2.000 tCO₂e',
    '1.600 tCO₂e',
    '1.200 tCO₂e',
  ]) {
    await expect(card).toContainText(text);
  }

  await expect(card.locator('.pc-gauge')).toContainText('97%');
  await expect(card).toContainText('25');
  await expect(card.locator('.pc-ledgers')).toContainText('Refunded to you');
});

test('#7 a tab with no campaigns says so and "Show all campaigns" brings the list back', async ({
  open,
}) => {
  const { page } = await openDonor(open, ({ read, url }) => {
    if (read === 'dashboard') {
      return { body: DASHBOARD };
    }

    return { body: url.searchParams.get('status') === 'refunding' ? cardsOf([]) : cardsOf(CARDS) };
  });

  await page.getByRole('button', { name: 'Refunding', exact: true }).click();

  await expect(page.locator('.donor-no-results')).toContainText('No refunding campaigns');
  await expect(page.locator('.donor-count')).toHaveText('3 supported');
  await page.getByRole('button', { name: 'Show all campaigns' }).click();
  await expect(page.locator('.portfolio-card')).toHaveCount(CARDS.length);
});

test('#8 a home with no campaigns invites the first one, and survival reads "—"', async ({
  open,
}) => {
  const { page } = await openDonor(open, ({ read }) => ({
    body: read === 'dashboard' ? EMPTY_DASHBOARD : cardsOf([]),
  }));
  const empty = page.locator('.donor-empty');

  await expect(empty).toContainText('Your first forest is waiting.');
  await expect(empty).toContainText('No funded campaigns yet.');
  await expect(empty.getByRole('link', { name: 'Explore campaigns' })).toHaveAttribute(
    'href',
    '/campaigns',
  );
  await expect(overview(page)).toContainText('SURVIVAL');
  await expect(overview(page)).toContainText('—');
});

test('#9 open flags are the open and the pending ones together', async ({ open }) => {
  const dashboard: Json = {
    ...DASHBOARD,
    totals: { ...(DASHBOARD.totals as Json), openFlags: 2 },
    flags: { ...(DASHBOARD.flags as Json), open: 1, pending: 1, total: 2 },
  };
  const { page } = await openDonor(open, ({ read }) => ({
    body: read === 'dashboard' ? dashboard : cardsOf(CARDS),
  }));

  await expect(page.getByRole('img', { name: /2 open flags/ })).toBeVisible();
});

test('#10 offline shows the snapshot banner, and "Refresh" back online toasts', async ({
  open,
}) => {
  const { page } = await openDonor(open);

  await expect(page.locator('.portfolio-card')).toHaveCount(CARDS.length);
  await page.context().setOffline(true);
  const banner = page.locator('.state-banner');

  await expect(banner).toContainText('Offline · Showing the last dashboard snapshot');
  await page.context().setOffline(false);
  await banner.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.locator('.toast')).toContainText('Dashboard refreshed');
});

test('#11 an unavailable dashboard says it could not load, with no zero total', async ({
  open,
}) => {
  const { page } = await openDonor(open, () => ({
    status: HTTP_UNAVAILABLE,
    body: { error: { code: 'service_unavailable', message: 'x' } },
  }));
  const alert = page.getByRole('alert');

  await expect(alert).toContainText('Couldn’t load your home');
  await expect(alert).toContainText('Your contributions haven’t changed.');
  await expect(alert.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.locator('.donor-duo')).toHaveCount(0);
});

test('#12 a planter sees "Role unavailable" and no donor request is made', async ({ open }) => {
  const { page, calls } = await openDonor(open, full, SARI);

  await expect(page.getByText('Role unavailable')).toBeVisible();
  expect(calls).toEqual([]);
});

test('#13 an operator with a wallet gets the dashboard of their own wallet', async ({ open }) => {
  const raka: MeProfile = { ...ALEX, role: 'operator', displayName: 'Raka' };
  const { page, calls } = await openDonor(open, full, raka);

  await expect(overview(page)).toContainText('USDC CONTRIBUTED');
  expect(calls.some((url) => url.pathname.endsWith('/dashboard'))).toBe(true);
});

test('#14 at 360 px the page does not scroll sideways', async ({ open }) => {
  const { page } = await openDonor(open, full, ALEX, PHONE);

  await expect(page.locator('.portfolio-card')).toHaveCount(CARDS.length);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);

  expect(width).toBeLessThanOrEqual(PHONE.width);
});

test('#15 while pending the loading line shows at once and the blocks only after 300 ms, with no total', async ({
  open,
}) => {
  const gate = Promise.withResolvers<void>();
  const { page } = await openDonor(open, ({ read }) => ({
    body: read === 'dashboard' ? DASHBOARD : cardsOf(CARDS),
    after: gate.promise,
  }));
  const loading = page.locator('.donor-loading');

  await expect(loading).toHaveAttribute('aria-busy', 'true');
  await expect(loading).toContainText('Loading your home…');
  await expect(loading.locator('.skeleton')).toHaveCount(0);
  await settle(page, SKELETON_MS * 2);
  await expect(loading.locator('.skeleton').first()).toBeVisible();
  await expect(page.locator('main')).not.toContainText('USDC CONTRIBUTED');
  gate.resolve();
});

test('#16 more cards are asked by the cursor, and a bad cursor keeps the cards with an alert', async ({
  open,
}) => {
  const { page, calls } = await openDonor(open, ({ read, url }) => {
    if (read === 'dashboard') {
      return { body: DASHBOARD };
    }

    if (url.searchParams.has('cursor')) {
      return {
        status: HTTP_BAD_REQUEST,
        body: { error: { code: 'invalid_cursor', message: 'x' } },
      };
    }

    return { body: cardsOf([ROOTS_CARD, MANGROVES_CARD], CURSOR, 3) };
  });

  await page.getByRole('button', { name: /^Lorem ipsum/ }).click();

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.portfolio-card')).toHaveCount(2);
  expect(calls.some((url) => url.searchParams.get('cursor') === CURSOR)).toBe(true);
});
