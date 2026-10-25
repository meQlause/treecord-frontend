// docs/FE/features/s08-batch.md §8, D08 Buy credits: #8-#20 on a local anvil with the frozen contracts (helpers/chain.ts).
// The buyer signs in through the real Privy test account; the app signs transactions with the test donor's key through the
// dev-server seam; the batch and the holdings are answered from what the ledger holds (the backend does not run).
import type { Page } from '@playwright/test';
import { expect, test, type Chain } from './helpers/chain';
import { goInApp } from './helpers/flow';
import { PLANTER, visitBatch, type Visit } from './helpers/carbon-page';

const USDC = 1_000_000n;
const PRICE = 18_500_000n;
const TEST_MS = 180_000;
/** Batch 101 as the spec describes it: 8.400 tCO₂e in stock at 18.5 USDC a tonne. */
const STOCK = 8400n;

test.describe.configure({ timeout: TEST_MS });

const panel = (page: Page) => page.locator('aside.cb-buy');

const amount = (page: Page) => page.getByLabel('Amount · tCO₂e');

const submit = (page: Page) => panel(page).getByRole('button', { name: 'Buy credits' });

const stage = async (chain: Chain) => {
  const batch = await chain.issueBatch({ amount: STOCK, price: PRICE });

  await chain.fund(500n * USDC);

  return batch;
};

const buyer = async (open: Parameters<typeof visitBatch>[0], chain: Chain) => {
  const batch = await stage(chain);

  return { batch, visit: await visitBatch(open, chain, batch) };
};

const toApproval = async (visit: Visit, text = '1.000'): Promise<void> => {
  await amount(visit.page).fill(text);
  await submit(visit.page).click();
  await expect(visit.page.getByText('Step 1 · Approve USDC allowance')).toBeVisible();
};

test('#8 the quote follows the typed amount', async ({ open, chain }) => {
  const { visit } = await buyer(open, chain);

  await amount(visit.page).fill('1.500');
  await expect(panel(visit.page).locator('.cb-quote')).toContainText('27.75');
});

test('#9 a bad amount is told off on submit, with no chain call', async ({ open, chain }) => {
  const { visit } = await buyer(open, chain);
  const { page } = visit;

  await amount(page).fill('1.2345');

  const before = visit.rpc.calls();

  await submit(page).click();
  await expect(page.getByRole('alert')).toHaveText('Use a positive amount with up to 3 decimals.');
  await expect(amount(page)).toHaveAttribute('aria-invalid', 'true');
  await amount(page).fill('8.401');
  await submit(page).click();
  await expect(page.getByRole('alert')).toHaveText('Amount exceeds available inventory.');
  expect(visit.rpc.calls()).toBe(before);
});

test('#10 "Max" fills the whole stock', async ({ open, chain }) => {
  const { visit } = await buyer(open, chain);

  await panel(visit.page).getByRole('button', { name: 'Max' }).click();
  await expect(amount(visit.page)).toHaveValue('8.400');
});

test('#11 with no allowance, submit asks for one, and approve asks the wallet exactly once', async ({
  open,
  chain,
}) => {
  const { visit } = await buyer(open, chain);

  await toApproval(visit);
  await visit.page.getByRole('button', { name: 'Approve in wallet' }).click();
  await expect(
    visit.page.getByText('Step 2 · Approval confirmed. Confirm purchase.'),
  ).toBeVisible();
  expect(await chain.allowanceOf(chain.ledger)).toBe(PRICE);
  expect(visit.rpc.sent()).toBe(1);
});

test('#12 after the approval, a double click on "Confirm purchase" buys once', async ({
  open,
  chain,
}) => {
  const { batch, visit } = await buyer(open, chain);

  await toApproval(visit);
  await visit.page.getByRole('button', { name: 'Approve in wallet' }).click();
  await visit.page.getByRole('button', { name: 'Confirm purchase' }).dblclick();
  await expect(visit.page.getByText('Purchase complete')).toBeVisible();
  expect((await chain.carbonState(batch.batchId)).held).toBe(1000n);
  expect(visit.rpc.sent()).toBe(2);
});

test('#13 an allowance that already covers the quote skips the approval', async ({
  open,
  chain,
}) => {
  const batch = await stage(chain);

  await chain.approve(chain.ledger, PRICE);

  const visit = await visitBatch(open, chain, batch);

  await amount(visit.page).fill('1.000');
  await submit(visit.page).click();
  await expect(
    visit.page.getByText('Step 2 · Approval confirmed. Confirm purchase.'),
  ).toBeVisible();
  await expect(visit.page.getByRole('button', { name: 'Approve in wallet' })).toHaveCount(0);
  expect(visit.rpc.sent()).toBe(0);
});

test('#14 a confirmed buy waits for the holdings, then shows the purchase and the new stock', async ({
  open,
  chain,
}) => {
  const batch = await stage(chain);

  await chain.approve(chain.ledger, PRICE);

  const visit = await visitBatch(open, chain, batch);
  const { page } = visit;

  await amount(page).fill('1.000');
  await submit(page).click();
  visit.shop.frozen = { inventory: STOCK, held: 0n };
  await page.getByRole('button', { name: 'Confirm purchase' }).click();
  await expect(page.getByText('Purchase confirmed · Updating inventory…')).toBeVisible();
  await expect(panel(page)).toContainText('8.400');
  visit.shop.frozen = null;
  await expect(page.getByText('Purchase complete')).toBeVisible();
  await expect(panel(page)).toContainText('1.000 tCO₂e');
  await expect(panel(page)).toContainText('18.5 USDC · Added to My carbon.');
  await expect(page.locator('.cb-stock-card, .carbon-wallet').first()).toContainText('7.400');
});

test('#15 a refusing wallet, or Cancel, ends in "Wallet rejected" with the form editable', async ({
  open,
  chain,
}) => {
  const { visit } = await buyer(open, chain);
  const { page } = visit;

  await toApproval(visit);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Wallet rejected. No credits purchased.')).toBeVisible();
  await expect(amount(page)).toBeEnabled();
  await submit(page).click();
  await expect(page.getByText('Step 1 · Approve USDC allowance')).toBeVisible();
  visit.rpc.refuseNext();
  await page.getByRole('button', { name: 'Approve in wallet' }).click();
  await expect(page.getByText('Wallet rejected. No credits purchased.')).toBeVisible();
  await expect(amount(page)).toBeEnabled();
  expect(visit.rpc.sent()).toBe(1);
});

test('#16 a reverted buy says it failed, leaves the stock, and reads the batch again', async ({
  open,
  chain,
}) => {
  const batch = await stage(chain);

  await chain.approve(chain.ledger, PRICE);

  const visit = await visitBatch(open, chain, batch);
  const { page } = visit;

  await amount(page).fill('1.000');
  await submit(page).click();
  // the receipt is spoiled, not the chain: what a real revert leaves is the stock as it was
  visit.rpc.revertReceipts();
  visit.shop.frozen = { inventory: STOCK, held: 0n };

  const reads = visit.shop.batchReads();

  await page.getByRole('button', { name: 'Confirm purchase' }).click();
  await expect(page.getByText('Purchase failed. No credits purchased.')).toBeVisible();
  await expect(panel(page)).toContainText('8.400');
  expect(visit.shop.batchReads()).toBeGreaterThan(reads);
});

test('#17 a price that moved is quoted again, with a line, and nothing is sent until the next submit', async ({
  open,
  chain,
}) => {
  const batch = await stage(chain);

  await chain.approve(chain.ledger, PRICE);

  const visit = await visitBatch(open, chain, batch);
  const { page } = visit;

  await amount(page).fill('1.000');
  await submit(page).click();
  // the price moves only once the review is up; earlier, the app's own read would quote it before "Confirm purchase"
  await expect(page.getByRole('button', { name: 'Confirm purchase' })).toBeVisible();
  visit.rpc.revertReceipts();
  visit.shop.price = '22000000';
  await page.getByRole('button', { name: 'Confirm purchase' }).click();
  await expect(page.locator('[data-copy="COPY-351"]')).toBeVisible();
  await expect(panel(page).locator('.cb-buy-price')).toContainText('22');
  await expect(panel(page).locator('.cb-quote')).toContainText('22');
  expect(visit.rpc.sent()).toBe(1);
});

test('#18 signed out the button reads "Sign in"; a planter gets the notice instead of a button', async ({
  open,
  chain,
}) => {
  const batch = await stage(chain);
  const out = await visitBatch(open, chain, batch, { profile: null });

  await panel(out.page).getByRole('button', { name: 'Sign in' }).click();
  await out.page.waitForURL(/\/sign-in\?returnTo=%2Fcarbon%2F\d+$/u);

  const planter = await visitBatch(open, chain, batch, { profile: PLANTER });

  await expect(amount(planter.page)).toBeDisabled();
  await expect(planter.page.locator('[data-copy="COPY-350"]')).toBeVisible();
  await expect(submit(planter.page)).toHaveCount(0);
});

test('#19 the typed amount survives leaving and coming back, and signing out removes it', async ({
  open,
  chain,
}) => {
  const { batch, visit } = await buyer(open, chain);
  const { page } = visit;

  await amount(page).fill('2.500');
  // a reload ends the login (D-7), so the page is left and opened again inside the app
  await goInApp(page, '/campaigns');
  await goInApp(page, `/carbon/${batch.batchId}`);
  await expect(amount(page)).toHaveValue('2.500');
  await page.locator('summary[aria-label^="Account"]').click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(window.sessionStorage).filter((key) => key.includes('treecord:draft:')),
    ),
  ).toEqual([]);
});

test('#20 "Back to purchase" returns an empty form on the new stock and sends nothing', async ({
  open,
  chain,
}) => {
  const batch = await stage(chain);

  await chain.approve(chain.ledger, PRICE);

  const visit = await visitBatch(open, chain, batch);
  const { page } = visit;

  await amount(page).fill('1.000');
  await submit(page).click();
  await page.getByRole('button', { name: 'Confirm purchase' }).click();
  await expect(page.getByText('Purchase complete')).toBeVisible();

  const sent = visit.rpc.sent();

  await page.getByRole('button', { name: 'Back to purchase' }).click();
  await expect(amount(page)).toHaveValue('');
  await expect(panel(page).locator('.cb-quote')).toContainText('—');
  await expect(submit(page)).toBeVisible();
  await expect(panel(page)).toContainText('7.400');
  expect(visit.rpc.sent()).toBe(sent);
});
