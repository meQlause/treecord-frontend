// The UI-gap states of Phase F2b (docs/FE/ui-gaps-treatments.md §3): mutation pending and failure (3, 4), conflict (5), validation
// (6), wallet not ready (7), next page (10), confirm (11) and focus (19), on S04, S08 and S15 with the wallet actions on a
// local anvil. Instances another spec already proves are named, not repeated: D4-7 and D4-12 in s04-wallet #12 and #15, S08
// 13b in s08-wallet #17, SR-2's object in s04-wallet #18, D5-8 in #25, the S15 failures in s15-my-carbon-wallet.
import type { Locator } from '@playwright/test';
import { SARI, type MeProfile } from './fixtures/accounts';
import { HOLDINGS, page as listing, retiredItem } from './fixtures/holdings';
import { failure } from './helpers/api';
import {
  actions,
  demak,
  field,
  HOUR,
  lapsed,
  press,
  refunding,
  review,
  toReview,
} from './helpers/campaign-stage';
import { visitBatch } from './helpers/carbon-page';
import { expect, test, type Chain } from './helpers/chain';
import { refocus } from './helpers/flow';
import { openCarbon } from './helpers/my-carbon-page';
import { meFollows, type MeState } from './helpers/profile';
import { visitCampaign, type Visit } from './helpers/wallet-page';

const USDC = 1_000_000n;
const TEST_MS = 180_000;
const FORBIDDEN = 403;
const NO_WALLET: MeProfile = { ...SARI, role: 'donor', walletAddress: null };

test.describe.configure({ timeout: TEST_MS });

type Kind = 'Contribute' | 'Start refund' | 'Claim refund';

type Staged = { visit: Visit; region: Locator };

/** The action's review is open and its Confirm is the next press: D04 with its allowance given, Start refund, D05. */
const stage = async (
  open: Parameters<typeof visitCampaign>[0],
  chain: Chain,
  kind: Kind,
): Promise<Staged> => {
  if (kind === 'Contribute') {
    const campaign = await demak(chain);

    await chain.approve(campaign, 25n * USDC);

    const visit = await visitCampaign(open, chain, campaign);

    await toReview(visit, '25');

    return { visit, region: review(visit.page, kind) };
  }

  const visit = await visitCampaign(
    open,
    chain,
    await (kind === 'Claim refund' ? refunding : lapsed)(chain),
  );

  await press(visit.page, kind).click();

  return { visit, region: review(visit.page, kind) };
};

const confirmIn = (region: Locator) => region.getByRole('button', { name: 'Confirm' });

const KINDS: Kind[] = ['Contribute', 'Start refund', 'Claim refund'];

// ---- 3 mutation-pending: D4-3, D4-5, D4-9, SR-4, D5-5 ----

test('pattern 3 mutation pending D04 D4-3: while the reads run the review shows a busy skeleton and Confirm waits', async ({
  open,
  chain,
}) => {
  const visit = await visitCampaign(open, chain, await demak(chain));
  const release = visit.rpc.hold('read');

  await field(visit.page).fill('25');
  await press(visit.page, 'Contribute').click();

  const region = review(visit.page, 'Contribute');

  await expect(region.locator('[aria-busy="true"]')).toBeVisible();
  await expect(confirmIn(region)).toBeDisabled();
  release();
  await expect(region).toContainText('USDC allowance');
});

test('pattern 3 mutation pending D04 D4-5: the approval reads "Processing…", is busy and disabled, and Confirm and Cancel wait', async ({
  open,
  chain,
}) => {
  const visit = await visitCampaign(open, chain, await demak(chain));

  await toReview(visit, '25');

  const region = review(visit.page, 'Contribute');
  const release = visit.rpc.hold('send');

  await region.getByRole('button', { name: 'Approve 25 USDC in wallet' }).click();
  await expect(region.locator('button[aria-busy="true"]')).toHaveText('Processing…');
  await expect(region.locator('button[aria-busy="true"]')).toBeDisabled();
  await expect(confirmIn(region)).toBeDisabled();
  await expect(region.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  release();
  await expect(region).toContainText('USDC allowance25 USDC');
});

for (const kind of KINDS) {
  test(`pattern 3 mutation pending ${kind}: Confirm reads "Processing…" at once, Cancel is disabled and Escape keeps the review`, async ({
    open,
    chain,
  }) => {
    const { visit, region } = await stage(open, chain, kind);
    const release = visit.rpc.hold('send');

    await confirmIn(region).click();
    await expect(region.locator('button[aria-busy="true"]')).toHaveText('Processing…');
    await expect(region.locator('button[aria-busy="true"]')).toBeDisabled();
    await expect(region.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await visit.page.keyboard.press('Escape');
    await expect(region).toBeVisible();
    release();
    await expect(region.locator('button[aria-busy="true"]')).toHaveCount(0);
  });
}

// ---- 4 mutation-failure: D4-13, D4-15, SR-8, SR-9, D5-9, D5-10 (rejected: s04-wallet #15, #19, #25) ----

const REVERTED: Record<Kind, string> = {
  Contribute: 'COPY-151',
  'Start refund': 'COPY-153',
  'Claim refund': 'COPY-153',
};

for (const kind of KINDS) {
  test(`pattern 4 mutation failure ${kind}: not enough gas, then a reverted transaction, each an alert inside the review with Confirm kept`, async ({
    open,
    chain,
  }) => {
    const { visit, region } = await stage(open, chain, kind);

    visit.rpc.noGasNext();
    await confirmIn(region).click();
    await expect(region.getByRole('alert').locator('[data-copy="COPY-155"]')).toBeVisible();
    await expect(confirmIn(region)).toBeEnabled();
    visit.rpc.revertReceipts();
    await confirmIn(region).click();
    await expect(
      region.getByRole('alert').locator(`[data-copy="${REVERTED[kind]}"]`),
    ).toBeVisible();
    await expect(confirmIn(region)).toBeEnabled();
  });
}

for (const kind of KINDS) {
  test(`pattern 4 mutation failure ${kind}: a wallet that cannot be put on the chain is an alert, nothing is sent and Confirm stays`, async ({
    open,
    chain,
  }) => {
    const { visit, region } = await stage(open, chain, kind);

    // no wallet to switch: what a Privy wallet that refuses the chain looks like to the app
    await visit.page.evaluate(() => {
      delete (window as { treecordE2E?: unknown }).treecordE2E;
    });
    await confirmIn(region).click();
    await expect(region.getByRole('alert').locator('[data-copy="COPY-156"]')).toBeVisible();
    await expect(confirmIn(region)).toBeEnabled();
    expect(visit.rpc.sent()).toBe(0);
  });
}

test('pattern 4 mutation failure D04 D4-14: not enough USDC is an alert and both Approve and Confirm stay disabled', async ({
  open,
  chain,
}) => {
  const visit = await visitCampaign(open, chain, await demak(chain));

  await toReview(visit, '600');

  const region = review(visit.page, 'Contribute');

  await expect(region.getByRole('alert').locator('[data-copy="COPY-154"]')).toBeVisible();
  await expect(confirmIn(region)).toBeDisabled();
  await expect(region.getByRole('button', { name: /^Approve/u })).toBeDisabled();
});

// ---- 5 conflict-409: D4-8, SR-3 (D4-7: s04-wallet #12; S08 13b: s08-wallet #17) ----

test('pattern 5 conflict S04 D4-8: a campaign that closed under the review closes it with a line at the top, and sends nothing', async ({
  open,
  chain,
}) => {
  const campaign = await chain.createCampaign({ fundingDeadlineIn: HOUR });

  await chain.contributeFrom(campaign, 250n * USDC);
  await chain.fund(500n * USDC);
  await chain.approve(campaign, 25n * USDC);

  const visit = await visitCampaign(open, chain, campaign);

  await toReview(visit, '25');
  await chain.warp(2 * HOUR);
  await confirmIn(review(visit.page, 'Contribute')).click();
  await expect(visit.page.locator('[data-copy="COPY-407"]')).toBeVisible();
  await expect(review(visit.page, 'Contribute')).toHaveCount(0);
  await expect(field(visit.page)).toHaveCount(0);
  expect(visit.rpc.sent()).toBe(0);
});

test('pattern 5 conflict S04 SR-3: refunds started by somebody else, found when Start refund is pressed, show a line at the top and open no review', async ({
  open,
  chain,
}) => {
  const campaign = await lapsed(chain);
  const visit = await visitCampaign(open, chain, campaign);

  await chain.startRefunding(campaign);
  await press(visit.page, 'Start refund').click();
  await expect(visit.page.locator('[data-copy="COPY-408"]')).toBeVisible();
  await expect(review(visit.page, 'Start refund')).toHaveCount(0);
  await expect(visit.page.locator('.detail-hero .badge')).toHaveText('Refunding');
  expect(visit.rpc.sent()).toBe(0);
});

// ---- 6 validation: D4-2 ----

test('pattern 6 validation S04 D4-2: the amount rule is the label suffix, up front, while Contribute stays disabled', async ({
  open,
  chain,
}) => {
  const { page } = await visitCampaign(open, chain, await demak(chain));

  await field(page).fill('1.1234567');
  await expect(actions(page).locator('label [data-copy="COPY-409"]')).toBeVisible();
  await expect(press(page, 'Contribute')).toBeDisabled();
});

// ---- 7 wallet-not-ready: S04 panel line, S08 #5, S15 #3 ----

test('pattern 7 wallet not ready S04: the panel says the wallet is being prepared, with a Try again that reads the page again', async ({
  open,
  chain,
}) => {
  const { page } = await visitCampaign(open, chain, await demak(chain), { wallet: null });
  const callout = actions(page).getByRole('alert');

  await expect(callout).toContainText(
    'Your wallet is still being prepared. Try again in a moment.',
  );
  await expect(callout.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(field(page)).toHaveCount(0);
});

test('pattern 7 wallet not ready S08: the buy panel holds a callout with Try again instead of "Buy credits"', async ({
  open,
  chain,
}) => {
  const batch = await chain.issueBatch({ amount: 8400n, price: 18_500_000n });
  const { page } = await visitBatch(open, chain, batch);
  const account: MeState = { current: NO_WALLET };
  const callout = page.locator('aside.cb-buy').getByRole('alert');

  // the wallet is not provisioned yet when the person comes back to the tab
  await meFollows(page, account);
  await refocus(page);
  await expect(callout).toContainText(
    'Your wallet is still being prepared. Try again in a moment.',
  );
  await expect(callout.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buy credits' })).toHaveCount(0);
});

test('pattern 7 wallet not ready S15: a 403 wallet_missing shows the callout, and Try again reads the holdings once more', async ({
  open,
}) => {
  let reads = 0;
  const { page } = await openCarbon(open, {
    holdings: () => {
      reads += 1;

      return failure(FORBIDDEN, 'wallet_missing');
    },
  });
  const callout = page.getByRole('alert');

  await expect(callout).toContainText(
    'Your wallet is still being prepared. Try again in a moment.',
  );
  await callout.getByRole('button', { name: 'Try again' }).click();
  await expect.poll(() => reads).toBe(2);
});

// ---- 10 next-page: S15 retirements (a failed page: s15-my-carbon #8) ----

test('pattern 10 next page S15: the row says "1 of 42", reads Loading… while the page is pending, and ends with the card appended', async ({
  open,
}) => {
  const gate = Promise.withResolvers<void>();
  const first = {
    ...HOLDINGS,
    retirements: listing([retiredItem('2')], 42, 'eyJiIjoiMjkxMDQ0ODAifQ'),
  };
  const { page } = await openCarbon(open, {
    holdings: () => first,
    more: () => gate.promise.then(() => listing([retiredItem('1', '100')], 42, 'eyJiIjoiMiJ9')),
  });

  await page.getByRole('button', { name: 'Retirements', exact: true }).click();
  await expect(page.getByText('1 of 42')).toBeVisible();
  await page
    .getByRole('button')
    .filter({ has: page.locator('[data-copy="COPY-353"]') })
    .click();

  const busy = page.locator('button[aria-busy="true"]');

  await expect(busy).toContainText('Loading…');
  await expect(busy).toBeDisabled();
  gate.resolve();
  await expect(page.locator('.campaign-card')).toHaveCount(2);
  await expect(page.getByText('2 of 42')).toBeVisible();
});

// ---- 11 confirm: Start refund names the campaign it changes ----

test('pattern 11 confirm Start refund: the review names the campaign above the summary', async ({
  open,
  chain,
}) => {
  const { region } = await stage(open, chain, 'Start refund');

  await expect(region.getByText('Campaign', { exact: true })).toBeVisible();
  await expect(region.getByText('A new tide for Demak', { exact: true })).toBeVisible();
});

// ---- 19 focus: D10 Purpose textarea ----

test('pattern 19 focus D10: the Purpose textarea shows the same 3 px focus ring as the inputs', async ({
  open,
}) => {
  const { page } = await openCarbon(open, { holdings: () => HOLDINGS });
  const ringOf = (target: Locator) =>
    target.evaluate((element) => {
      const { outlineStyle, outlineWidth } = getComputedStyle(element);

      return { outlineStyle, outlineWidth };
    });

  await page.getByRole('button', { name: 'Retire credits' }).click();

  const dialog = page.getByRole('dialog');

  await dialog.getByLabel('Beneficiary').focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByLabel('Purpose')).toBeFocused();

  const textareaRing = await ringOf(dialog.getByLabel('Purpose'));

  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByLabel('Beneficiary')).toBeFocused();

  const inputRing = await ringOf(dialog.getByLabel('Beneficiary'));

  expect(textareaRing.outlineStyle).not.toBe('none');
  expect(textareaRing).toEqual(inputRing);
});
