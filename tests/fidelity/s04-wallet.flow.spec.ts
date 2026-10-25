// docs/FE/features/s04-campaign.md §7, the wallet half: D04 Contribute (#7-#16), Start refund (#18, #19) and D05 Claim refund
// (#21-#23, #25), on a local anvil with the frozen contracts (helpers/chain.ts). The app signs with the test donor's key
// through the dev-server seam; the campaign API is answered from what the chain says (the backend does not run). D06 is F4a.
import { DONOR_KEY, expect, test } from './helpers/chain';
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
  USDC,
} from './helpers/campaign-stage';
import { visitCampaign } from './helpers/wallet-page';

const WEEK = 7 * 24 * 3600;
const TEST_MS = 180_000;

test.describe.configure({ timeout: TEST_MS });

test('#7 Alex on Demak: the CTA and the D04 field carry the chosen amount', async ({
  open,
  chain,
}) => {
  const { page } = await visitCampaign(open, chain, await demak(chain));

  await expect(
    page.locator('aside.funding-panel').getByRole('button', { name: 'Contribute 100 USDC' }),
  ).toBeVisible();
  await expect(field(page)).toHaveValue('100');
});

test('#8 the review of 25 USDC with no allowance asks to approve first', async ({
  open,
  chain,
}) => {
  const visit = await visitCampaign(open, chain, await demak(chain));

  await toReview(visit, '25');

  const region = review(visit.page, 'Contribute');

  await expect(region).toContainText('25 USDC from your wallet.');
  await expect(region).toContainText('USDC allowance0 USDC');
  await expect(region).toContainText('Step1 of 2 · approve USDC, then contribute');
  await expect(region.getByRole('button', { name: 'Approve 25 USDC in wallet' })).toBeVisible();
  await expect(region.getByRole('button', { name: 'Confirm' })).toBeDisabled();
});

test('#9 approving unlocks Confirm, which sends one contribute and no second approve', async ({
  open,
  chain,
}) => {
  const campaign = await demak(chain);
  const visit = await visitCampaign(open, chain, campaign);

  await toReview(visit, '25');

  const region = review(visit.page, 'Contribute');

  await region.getByRole('button', { name: 'Approve 25 USDC in wallet' }).click();
  await expect(region).toContainText('USDC allowance25 USDC');
  await expect(region).toContainText('StepContribute');
  await expect(region.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  await region.getByRole('button', { name: 'Confirm' }).click();
  await expect.poll(async () => (await chain.read(campaign)).contributed).toBe(275n * USDC);
  expect(visit.rpc.sent()).toBe(2);
});

test('#10 an allowance that is enough shows no approve button and sends only contribute', async ({
  open,
  chain,
}) => {
  const campaign = await demak(chain);

  await chain.approve(campaign, 25n * USDC);

  const visit = await visitCampaign(open, chain, campaign);

  await toReview(visit, '25');

  const region = review(visit.page, 'Contribute');

  await expect(region.getByRole('button', { name: /^Approve/u })).toHaveCount(0);
  await region.getByRole('button', { name: 'Confirm' }).click();
  await expect.poll(async () => (await chain.read(campaign)).contributed).toBe(275n * USDC);
  expect(visit.rpc.sent()).toBe(1);
});

test('#11 an amount above what is left is cut to what the contract will take', async ({
  open,
  chain,
}) => {
  const visit = await visitCampaign(open, chain, await demak(chain, { raised: 9800n * USDC }));

  await toReview(visit, '250');

  const region = review(visit.page, 'Contribute');

  await expect(region).toContainText('200 USDC from your wallet.');
  await expect(region.getByRole('button', { name: 'Approve 200 USDC in wallet' })).toBeVisible();
});

test('#12 a remainder that moved updates the review and sends nothing until Confirm is pressed again', async ({
  open,
  chain,
}) => {
  const campaign = await demak(chain, { raised: 9800n * USDC });

  await chain.approve(campaign, 200n * USDC);

  const visit = await visitCampaign(open, chain, campaign);

  await toReview(visit, '250');

  const region = review(visit.page, 'Contribute');

  await expect(region).toContainText('200 USDC from your wallet.');
  await chain.contributeFrom(campaign, 50n * USDC);
  await region.getByRole('button', { name: 'Confirm' }).click();
  await expect(region).toContainText('150 USDC from your wallet.');
  expect(visit.rpc.sent()).toBe(0);
});

test('#13 an amount with too many decimals, zero, or nothing leaves "Contribute" disabled', async ({
  open,
  chain,
}) => {
  const { page } = await visitCampaign(open, chain, await demak(chain));

  for (const text of ['10.1234567', '0', '']) {
    await field(page).fill(text);
    await expect(press(page, 'Contribute')).toBeDisabled();
  }

  await field(page).fill('10.123456');
  await expect(press(page, 'Contribute')).toBeEnabled();
});

test('#14 the hash shows "on its way"; the confirmed line and the figures wait for the page to say so', async ({
  open,
  chain,
}) => {
  const campaign = await demak(chain);

  await chain.approve(campaign, 25n * USDC);

  const visit = await visitCampaign(open, chain, campaign);
  const { page } = visit;

  await toReview(visit, '25');

  const release = visit.hold();

  await review(page, 'Contribute').getByRole('button', { name: 'Confirm' }).click();
  await expect(
    page.getByText('Done. Contribute is on its way; its status updates here.'),
  ).toBeVisible();
  await expect(page.locator('aside.funding-panel')).toContainText('6,840');
  await expect(page.getByText(/^Contribution confirmed/u)).toHaveCount(0);
  release();
  await expect(page.getByText('Contribution confirmed: 275 USDC.')).toBeVisible();
  await expect(page.locator('aside.funding-panel')).toContainText('6,865');
  await expect(page.locator('aside.funding-panel')).toContainText('69%');
});

test('#15 a wallet that refuses contribute leaves the amount and an alert, and no confirmation', async ({
  open,
  chain,
}) => {
  const campaign = await demak(chain);

  await chain.approve(campaign, 25n * USDC);

  const visit = await visitCampaign(open, chain, campaign);
  const { page } = visit;

  await toReview(visit, '25');
  visit.rpc.refuseNext();
  await review(page, 'Contribute').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByTestId('d04-error')).toBeVisible();
  await expect(field(page)).toHaveValue('25');
  await expect(page.getByText(/^Contribution confirmed/u)).toHaveCount(0);
  expect((await chain.read(campaign)).contributed).toBe(250n * USDC);
});

test('#16 a double click on Confirm reaches the wallet once', async ({ open, chain }) => {
  const campaign = await demak(chain);

  await chain.approve(campaign, 25n * USDC);

  const visit = await visitCampaign(open, chain, campaign);

  await toReview(visit, '25');
  await review(visit.page, 'Contribute').getByRole('button', { name: 'Confirm' }).dblclick();
  await expect(visit.page.getByText('Contribution confirmed: 275 USDC.')).toBeVisible();
  expect(visit.rpc.sent()).toBe(1);
});

test('#18 after the deadline Start refund is offered, and confirmed it turns the campaign to Refunding', async ({
  open,
  chain,
}) => {
  const { page } = await visitCampaign(open, chain, await lapsed(chain));

  await expect(page.locator('.detail-hero .badge')).toHaveText('Funding');
  await expect(page.getByText('Funding deadline passed · refunds can start')).toBeVisible();
  await press(page, 'Start refund').click();
  await expect(review(page, 'Start refund')).toContainText('A new tide');
  await review(page, 'Start refund').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Refunds started. The campaign is now Refunding.')).toBeVisible();
  await expect(page.locator('.detail-hero .badge')).toHaveText('Refunding');
});

test('#19 a refused Start refund leaves Funding, an alert, and the review to try again', async ({
  open,
  chain,
}) => {
  const visit = await visitCampaign(open, chain, await lapsed(chain));
  const { page } = visit;

  await press(page, 'Start refund').click();
  visit.rpc.refuseNext();
  await review(page, 'Start refund').getByRole('button', { name: 'Confirm' }).click();
  await expect(review(page, 'Start refund').getByRole('alert')).toBeVisible();
  await expect(page.locator('.detail-hero .badge')).toHaveText('Funding');
  await expect(review(page, 'Start refund').getByRole('button', { name: 'Confirm' })).toBeEnabled();
  await review(page, 'Start refund').getByRole('button', { name: 'Cancel' }).click();
  await expect(press(page, 'Start refund')).toBeEnabled();
});

test('#21 a refunding campaign shows the donor what they can claim, and the review says so', async ({
  open,
  chain,
}) => {
  const { page } = await visitCampaign(open, chain, await refunding(chain));

  await expect(actions(page)).toContainText('Refundable amount250 USDC');
  await expect(actions(page)).toContainText('EligibilityContributor');
  await expect(page.locator('aside.funding-panel')).toContainText(
    'Refunds available to contributors',
  );
  await press(page, 'Claim refund').click();
  await expect(review(page, 'Claim refund')).toContainText(
    'Claim your 250 USDC refundable balance.',
  );
});

/** `value` as the page prints USDC: whole units grouped, the fraction without trailing zeros. */
const printed = (value: bigint): string => {
  const whole = (value / USDC).toLocaleString('en-US');
  const fraction = (value % USDC)
    .toString()
    .padStart(6, '0')
    .replace(/0{1,6}$/u, '');

  return fraction === '' ? whole : `${whole}.${fraction}`;
};

test('#22 a completed campaign refunds the pool pro rata to the contribution', async ({
  open,
  chain,
}) => {
  const campaign = await chain.createCampaign({ fundingTarget: 9000n * USDC, treeTarget: 10 });

  await chain.contributeFrom(campaign, 8100n * USDC);
  await chain.contributeFrom(campaign, 900n * USDC, DONOR_KEY);
  await chain.warp(2 * WEEK + 40 * HOUR);
  await chain.complete(campaign);

  const state = await chain.read(campaign);

  expect(state.pool).toBeGreaterThan(0n);

  const { page } = await visitCampaign(open, chain, campaign);

  await expect(actions(page)).toContainText(
    `Refundable amount${printed((state.pool * state.contributed) / state.raised)} USDC`,
  );
});

test('#23 a refund already claimed reads 0 USDC and cannot be claimed again', async ({
  open,
  chain,
}) => {
  const campaign = await refunding(chain);

  await chain.claimRefund(campaign);

  const { page } = await visitCampaign(open, chain, campaign);

  await expect(actions(page)).toContainText('Refundable amount0 USDC');
  await expect(press(page, 'Claim refund')).toBeDisabled();
});

test('#25 a confirmed claim says so; a refused one leaves the claim open', async ({
  open,
  chain,
}) => {
  const campaign = await refunding(chain);
  const visit = await visitCampaign(open, chain, campaign);
  const { page } = visit;

  await press(page, 'Claim refund').click();
  visit.rpc.refuseNext();
  await review(page, 'Claim refund').getByRole('button', { name: 'Confirm' }).click();
  await expect(review(page, 'Claim refund').getByRole('alert')).toBeVisible();
  await expect(review(page, 'Claim refund').getByRole('button', { name: 'Confirm' })).toBeEnabled();
  await review(page, 'Claim refund').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Refund confirmed.')).toBeVisible();
  expect((await chain.read(campaign)).claimed).toBe(true);
});

// NFR-054: every wallet action of S04 sends one transaction however fast the button is pressed (Contribute: #16).
test('NFR-054 a double click on the approval sends one transaction', async ({ open, chain }) => {
  const visit = await visitCampaign(open, chain, await demak(chain));

  await toReview(visit, '25');
  await review(visit.page, 'Contribute')
    .getByRole('button', { name: 'Approve 25 USDC in wallet' })
    .dblclick();
  await expect(review(visit.page, 'Contribute')).toContainText('USDC allowance25 USDC');
  expect(visit.rpc.sent()).toBe(1);
});

test('NFR-054 a double click on Start refund sends one transaction', async ({ open, chain }) => {
  const { page, rpc } = await visitCampaign(open, chain, await lapsed(chain));

  await press(page, 'Start refund').click();
  await review(page, 'Start refund').getByRole('button', { name: 'Confirm' }).dblclick();
  await expect(page.locator('.detail-hero .badge')).toHaveText('Refunding');
  expect(rpc.sent()).toBe(1);
});

test('NFR-054 a double click on Claim refund sends one transaction', async ({ open, chain }) => {
  const { page, rpc } = await visitCampaign(open, chain, await refunding(chain));

  await press(page, 'Claim refund').click();
  await review(page, 'Claim refund').getByRole('button', { name: 'Confirm' }).dblclick();
  await expect(page.getByText('Refund confirmed.')).toBeVisible();
  expect(rpc.sent()).toBe(1);
});
