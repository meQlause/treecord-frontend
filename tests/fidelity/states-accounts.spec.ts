// docs/phases.md F2a: "UI-gap states reached: refresh (2: S13), conflict (5: S11), next page (10: S13), S12 links by role
// (22), score job hash "—" (25)". The same shape as the F1a and F1b state tests, in a file of their own (states.spec.ts is
// at its line limit): each pattern is reached in the real app through what the network answers, never a `?state=` switch.
// Sign-in uses the real Privy test account; `GET /me` follows the profile the spec holds.
import type { Page } from '@playwright/test';
import { SARI, meBody, type MeProfile } from './fixtures/accounts';
import { claim, failedFlag, FLAG_ID } from './fixtures/job';
import { CARDS, DASHBOARD, ROOTS_CARD, MANGROVES_CARD, cardsOf } from './fixtures/donor';
import { expect, signInWith, test, type OpenOptions } from './helpers/flow';
import { answerDonor } from './helpers/donor';
import { answerJobs } from './helpers/jobs';
import { answerProfile, meFollows, refused, type MeState } from './helpers/profile';
import { VIEWPORTS } from './matrix';

const WIDE = VIEWPORTS[1];
const WALLET = '0x71c7656ec7ab88b098defb751b7401b5f6d8976f';
const ALEX: MeProfile = {
  ...SARI,
  role: 'donor',
  displayName: 'Alex',
  walletAddress: WALLET,
  isBuyer: true,
  carbonRightsAgreementAccepted: true,
  carbonRightsAcceptedAt: '2026-10-20T02:41:09.118Z',
};
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const FADE_MS = 300;
const TEST_MS = 120_000;
const CURSOR = 'eyJiIjoiMjkxMDQ0ODAifQ';

test.describe.configure({ timeout: TEST_MS });

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

type Routes = (page: Page, account: MeState) => Promise<void>;

type Where = { row: string; profile: MeProfile; path: string };

/** Signs in as `profile` on `row`, with `routes` answering the page's own reads, and lands on `path`. */
const openAs = async (
  open: Open,
  { row, profile, path }: Where,
  routes: Routes,
): Promise<{ page: Page; account: MeState }> => {
  const { page } = await open({ row, viewport: WIDE });
  const account: MeState = { current: profile };

  await signInWith(page, meBody(profile), {
    returnTo: path,
    setup: async (target) => {
      await meFollows(target, account);
      await routes(target, account);
    },
  });
  await page.getByRole('button', { name: /^Continue to/ }).click();
  await page.waitForURL(`**${path}`);

  return { page, account };
};

const cards = (page: Page) => page.locator('.portfolio-card');

test('pattern 2 refresh S13: a pressed tab shows at once, the old cards stay faded and busy, and no skeleton flashes', async ({
  open,
}) => {
  const gate = Promise.withResolvers<void>();
  const { page } = await openAs(open, { row: 'S13', profile: ALEX, path: '/app/donor' }, (target) =>
    answerDonor(
      target,
      ({ read, url }) => {
        if (read === 'dashboard') {
          return { body: DASHBOARD };
        }

        return url.searchParams.get('status') === 'active'
          ? { body: cardsOf([ROOTS_CARD]), after: gate.promise }
          : { body: cardsOf(CARDS) };
      },
      [],
    ),
  );
  const list = page.locator('.donor-campaigns [aria-busy="true"]');

  await expect(cards(page)).toHaveCount(CARDS.length);
  await page.getByRole('button', { name: 'Active', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Active', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(list).toBeVisible();
  await expect(cards(page)).toHaveCount(CARDS.length);
  await expect(page.locator('.donor-campaigns .skeleton')).toHaveCount(0);
  await expect(list).toHaveClass(/is-refreshing/, { timeout: FADE_MS * 5 });
  gate.resolve();
  await expect(cards(page)).toHaveCount(1);
  await expect(page.locator('.is-refreshing')).toHaveCount(0);
});

test('pattern 5 conflict S11: "agreement_required" opens the agreement, shows the alert and reads the profile again', async ({
  open,
}) => {
  const { page, account } = await openAs(
    open,
    { row: 'S11', profile: ALEX, path: '/app/profile' },
    (target) => answerProfile(target, () => refused(HTTP_BAD_REQUEST, 'agreement_required'), []),
  );
  const before = account.reads ?? 0;

  await page.getByRole('button', { name: 'Become a planter' }).click();
  account.current = { ...ALEX, carbonRightsAgreementAccepted: false };
  await page
    .getByRole('region', { name: /^Review / })
    .getByRole('button', { name: 'Confirm' })
    .click();

  await expect(page.getByRole('region', { name: /^Review / }).getByRole('alert')).toBeVisible();
  await expect(page.getByLabel(/I accept the planter agreement/)).toBeVisible();
  await expect.poll(() => account.reads ?? 0).toBeGreaterThan(before);
});

test('pattern 5 conflict S11: "role_locked" shows the alert, holds "Confirm" and reads the profile again', async ({
  open,
}) => {
  const { page, account } = await openAs(
    open,
    { row: 'S11', profile: ALEX, path: '/app/profile' },
    (target) => answerProfile(target, () => refused(HTTP_FORBIDDEN, 'role_locked'), []),
  );
  const before = account.reads ?? 0;
  const review = page.getByRole('region', { name: /^Review / });

  await page.getByRole('button', { name: 'Become a planter' }).click();
  await review.getByRole('button', { name: 'Confirm' }).click();

  await expect(review.getByRole('alert')).toBeVisible();
  await expect(review.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  await expect.poll(() => account.reads ?? 0).toBeGreaterThan(before);
});

test('pattern 10 next page S13: the row says "2 of 3", reads Loading… while pending and ends with the cards appended', async ({
  open,
}) => {
  const gate = Promise.withResolvers<void>();
  const { page } = await openAs(open, { row: 'S13', profile: ALEX, path: '/app/donor' }, (target) =>
    answerDonor(
      target,
      ({ read, url }) => {
        if (read === 'dashboard') {
          return { body: DASHBOARD };
        }

        return url.searchParams.has('cursor')
          ? { body: cardsOf([MANGROVES_CARD], null, 3), after: gate.promise }
          : { body: cardsOf([CARDS[0] ?? {}, ROOTS_CARD], CURSOR, 3) };
      },
      [],
    ),
  );
  const more = page.locator('.load-more').getByRole('button');

  await expect(cards(page)).toHaveCount(2);
  await expect(page.locator('.load-more')).toContainText('2 of 3');
  await more.click();
  await expect(more).toBeDisabled();
  await expect(more).toHaveAttribute('aria-busy', 'true');
  await expect(more).toContainText('Loading…');
  gate.resolve();
  await expect(cards(page)).toHaveCount(CARDS.length);
  await expect(page.locator('.load-more').getByRole('button')).toHaveCount(0);
});

test('pattern 22 S12 links by role: a planter on a flag job gets "View tree" and no link they cannot open', async ({
  open,
}) => {
  const { page } = await openAs(
    open,
    { row: 'S12', profile: SARI, path: `/app/jobs/${FLAG_ID}` },
    (target) => answerJobs(target, () => ({ body: failedFlag() }), []),
  );
  const links = page.locator('.pl-panel .pl-actions a');

  await expect(links).toHaveText(['View tree']);
  await expect(links.first()).toHaveAttribute('href', '/trees/3091');
});

test('pattern 25 score job hash S12: a confirmed score job reads "—" and not "Pending"', async ({
  open,
}) => {
  const { page } = await openAs(
    open,
    { row: 'S12', profile: SARI, path: `/app/jobs/${FLAG_ID}` },
    (target) =>
      answerJobs(target, () => ({ body: claim({ id: FLAG_ID, kind: 'score', txHash: null }) }), []),
  );
  const hash = page.getByTestId('job-tx');

  await expect(hash).toHaveText('—');
  await expect(hash).not.toHaveText('Pending');
});
