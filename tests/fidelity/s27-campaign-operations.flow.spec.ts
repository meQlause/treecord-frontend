// docs/FE/features/s27-campaign-operations.md §7: one test per criterion #1..#25, in the browser, under the docs/FE/fidelity.md §2
// conditions. Sign-in uses the real Privy test account (backend/.env); the read model, the batches, the four writes and the jobs
// are answered by the spec with the operations.md and carbon.md examples (the backend does not run).
import type { Page } from '@playwright/test';
import { ALEX } from './fixtures/shell-accounts';
import { BATCH_101_ITEM, JOB, MANGROVES, job, ops } from './fixtures/operations';
import { failure } from './helpers/api';
import { expect, refocus, signInWith, test } from './helpers/flow';
import { RAKA, openOperations, type Scene } from './helpers/operations-page';
import { meBody } from './fixtures/accounts';

const TEST_MS = 120_000;
const WALLET = '0x4B9E2c1D7a3F5e8B0c6D9a2E4f1b3C5d7E9f9D0e';
const HTTP_UNAVAILABLE = 503;
const HTTP_CONFLICT = 409;
const OFFLINE = 'Offline · showing saved data. Network actions are unavailable.';

test.describe.configure({ timeout: TEST_MS });

const tab = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

const fact = (page: Page, name: string) =>
  page
    .locator('.ws-facts > div')
    .filter({ has: page.locator('dt', { hasText: new RegExp(`^${name}$`, 'u') }) })
    .locator('dd');

// inside the tab's panel: a tab and its action can share a name ("Mirror issuance")
const trigger = (page: Page, name: string) =>
  page.locator('section.ws-panel').getByRole('button', { name, exact: true });

const review = (page: Page, name: string) => page.getByRole('region', { name: `Review ${name}` });

const confirm = (page: Page, name: string) =>
  review(page, name).getByRole('button', { name: 'Confirm' });

const wallet = (page: Page) => page.getByLabel(/^Planter wallet/u);

const slots = (page: Page) => page.getByLabel(/^Slot count/u);

const callout = (page: Page) => page.locator('.ws-callout');

/** The anchor form filled with a wallet and a count, "Assign anchor slots" pressed: the D14 is open. */
const toReview = async (page: Page, count = '3', who = WALLET): Promise<void> => {
  await wallet(page).fill(who);
  await slots(page).fill(count);
  await trigger(page, 'Assign anchor slots').click();
};

test('#1 a donor sees "Role unavailable" and no operator request is made', async ({ open }) => {
  const { page } = await open({ row: 'S27' });
  const seen: string[] = [];

  page.on('request', (request) => seen.push(request.url()));
  await signInWith(page, meBody(ALEX), { returnTo: '/app/operator/campaigns/0xabc' });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await expect(page.getByText('Role unavailable')).toBeVisible();
  await expect(page.getByText('This screen is for Operator accounts.')).toBeVisible();
  expect(seen.filter((url) => url.includes('/operator/'))).toEqual([]);
});

test('#2 the example shows the campaign, its tag, the pressed first tab and the anchor figures', async ({
  open,
}) => {
  const { page } = await openOperations(open);

  await expect(page.getByText('CAMPAIGN OPERATIONS')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Roots that stay');
  await expect(page.locator('.ws-intro')).toContainText('active');
  await expect(tab(page, 'Anchor assignment')).toHaveAttribute('aria-pressed', 'true');
  await expect(fact(page, 'Available anchor slots')).toHaveText('300');
  await expect(fact(page, 'Rolled-over open slots')).toHaveText('0');
});

test('#3 a null rolled-over figure reads "—"', async ({ open }) => {
  const { page } = await openOperations(open, {
    campaign: () => ops({ anchor: { rolledOverOpenSlots: null } }),
  });

  await expect(fact(page, 'Rolled-over open slots')).toHaveText('—');
});

test('#4 an unknown campaign says "Campaign not found"', async ({ open }) => {
  const { page } = await openOperations(open, {
    address: '0x00000000000000000000000000000000000000ff',
    campaign: () => failure(404, 'not_found'),
  });

  await expect(page.getByText('Campaign not found')).toBeVisible();
});

test('#5 a 39-digit wallet, a count of 0, or more than the available slots keeps "Assign anchor slots" disabled', async ({
  open,
}) => {
  const { page } = await openOperations(open);

  await wallet(page).fill(WALLET.slice(0, -1));
  await slots(page).fill('3');
  await expect(trigger(page, 'Assign anchor slots')).toBeDisabled();
  await wallet(page).fill(WALLET);
  await slots(page).fill('0');
  await expect(trigger(page, 'Assign anchor slots')).toBeDisabled();
  await slots(page).fill('301');
  await expect(trigger(page, 'Assign anchor slots')).toBeDisabled();
});

test('#6 a campaign still funding says it must be Active and keeps the button disabled', async ({
  open,
}) => {
  const { page } = await openOperations(open, {
    campaign: () => ops({ campaign: { status: 'funding' } }),
  });

  await wallet(page).fill(WALLET);
  await expect(page.getByText('Campaign must be Active.')).toBeVisible();
  await expect(trigger(page, 'Assign anchor slots')).toBeDisabled();
});

test('#7 the review names the wallet and the count; Cancel sends nothing', async ({ open }) => {
  const { page, writes } = await openOperations(open);

  await toReview(page);
  await expect(review(page, 'Assign anchor slots')).toContainText(
    `Assign 3 slots to ${WALLET}. Confirmation queues a job.`,
  );
  await review(page, 'Assign anchor slots').getByRole('button', { name: 'Cancel' }).click();
  expect(writes).toEqual([]);
});

test('#8 Confirm sends one assignment with an s27-anchor key, shows the pending job, and the row follows the job', async ({
  open,
}) => {
  let confirmed = false;
  const { page, writes } = await openOperations(open, {
    campaign: () => (confirmed ? ops({ anchor: { queuedSlots: 6, availableSlots: 306 } }) : ops()),
    job: () => job('anchor_assign', confirmed ? 'confirmed' : 'pending'),
  });

  await toReview(page);
  await confirm(page, 'Assign anchor slots').click();
  await expect(
    page.getByText('Done. Assign anchor slots is on its way; its status updates here.'),
  ).toBeVisible();
  await expect(callout(page)).toContainText('pending');
  await expect(callout(page).getByRole('link', { name: 'Track job' })).toHaveAttribute(
    'href',
    `/app/jobs/${JOB}`,
  );
  await expect(callout(page)).toContainText('Queued is not confirmed.');
  expect(writes).toHaveLength(1);
  expect(writes[0]?.body).toEqual({ planter: WALLET, count: 3 });
  expect(writes[0]?.headers['idempotency-key']).toMatch(/^s27-anchor-/u);
  confirmed = true;
  await expect(fact(page, 'Available anchor slots')).toHaveText('306', { timeout: 15_000 });
});

test('#9 a Confirm that failed is sent again with the same Idempotency-Key', async ({ open }) => {
  const { page, writes } = await openOperations(open, {
    write: (_call, before) =>
      before === 0
        ? failure(HTTP_UNAVAILABLE, 'service_unavailable')
        : { status: 202, body: job('anchor_assign', 'pending') },
  });

  await toReview(page);
  await confirm(page, 'Assign anchor slots').click();
  await expect(review(page, 'Assign anchor slots').getByRole('alert')).toBeVisible();
  await confirm(page, 'Assign anchor slots').click();
  await expect(callout(page)).toBeVisible();
  expect(writes[1]?.headers['idempotency-key']).toBe(writes[0]?.headers['idempotency-key']);
});

test('#10 the estimate tab lists the inputs and "Not computed"', async ({ open }) => {
  const { page } = await openOperations(open);

  await tab(page, 'Carbon estimate').click();
  await expect(fact(page, 'Method')).toHaveText('linear-maturity-v1');
  await expect(fact(page, 'Species')).toHaveText('Mahogany');
  await expect(fact(page, 'Tree count')).toHaveText('1186');
  await expect(fact(page, 'Commitment')).toHaveText('36 months');
  await expect(fact(page, 'Mature rate / years to maturity')).toHaveText('30 kg/yr / 20 years');
  await expect(fact(page, 'kg per tree / average maturity')).toHaveText('6.75 kg / 7.5%');
  await expect(fact(page, 'Current estimate')).toHaveText('Not computed');
});

test('#11 computing queues a job; the estimate stays "Not computed" until the read model has it', async ({
  open,
}) => {
  let indexed = false;
  const { page, writes } = await openOperations(open, {
    campaign: () =>
      ops({
        estimate: { current: indexed ? { amount: '8005', label: 'pre-certification' } : null },
      }),
    job: () => job('estimate', indexed ? 'confirmed' : 'pending'),
  });

  await tab(page, 'Carbon estimate').click();
  await trigger(page, 'Compute & set estimate').click();
  await confirm(page, 'Compute & set estimate').click();
  await expect(callout(page)).toBeVisible();
  await expect(fact(page, 'Current estimate')).toHaveText('Not computed');
  expect(writes[0]?.body).toEqual({});
  indexed = true;
  await expect(fact(page, 'Current estimate')).toHaveText('8.005 tCO₂e pre-certification', {
    timeout: 15_000,
  });
});

test('#12 a small campaign with an indexed estimate reads 0.054 tCO₂e', async ({ open }) => {
  const { page } = await openOperations(open, {
    campaign: () =>
      ops({ estimate: { treeCount: 8, current: { amount: '54', label: 'pre-certification' } } }),
  });

  await tab(page, 'Carbon estimate').click();
  await expect(fact(page, 'kg per tree / average maturity')).toHaveText('6.75 kg / 7.5%');
  await expect(fact(page, 'Current estimate')).toHaveText('0.054 tCO₂e pre-certification');
});

test('#13 a locked estimate disables the button and says why', async ({ open }) => {
  const { page } = await openOperations(open, {
    campaign: () => ops({ estimate: { locked: true } }),
  });

  await tab(page, 'Carbon estimate').click();
  await expect(trigger(page, 'Compute & set estimate')).toBeDisabled();
  await expect(page.getByText('Estimate locked after first issuance.')).toBeVisible();
});

test('#14 the vintage starts at the current year', async ({ open }) => {
  const { page } = await openOperations(open);

  await tab(page, 'Mirror issuance').click();
  await expect(page.getByLabel(/^Vintage/u)).toHaveValue('2026');
});

/** The issuance form filled with the criterion's values. */
const fillIssuance = async (page: Page, tonnes = '12.5'): Promise<void> => {
  await tab(page, 'Mirror issuance').click();
  await page.getByLabel(/^Registry/u).fill('SRN-PPI');
  await page.getByLabel(/^Serial start/u).fill('SRN-2026-00001');
  await page.getByLabel(/^Serial end/u).fill('SRN-2026-12500');
  await page.getByLabel(/^Tonnes/u).fill(tonnes);
};

test('#15 the review names tonnes, registry and vintage; Confirm sends the body with an s27-issue key', async ({
  open,
}) => {
  const { page, writes } = await openOperations(open);

  await fillIssuance(page);
  await trigger(page, 'Mirror issuance').click();
  await expect(review(page, 'Mirror issuance')).toContainText(
    '12.5 tCO₂e · SRN-PPI · 2026. Allocations are unavailable until confirmation and indexing.',
  );
  await confirm(page, 'Mirror issuance').click();
  await expect(callout(page)).toBeVisible();
  expect(writes[0]?.body).toEqual({
    registry: 'SRN-PPI',
    vintage: 2026,
    serialStart: 'SRN-2026-00001',
    serialEnd: 'SRN-2026-12500',
    tonnes: '12.5',
  });
  expect(writes[0]?.headers['idempotency-key']).toMatch(/^s27-issue-/u);
});

test('#16 tonnes of 1.2345, 012.5 or 0 keep "Mirror issuance" disabled', async ({ open }) => {
  const { page } = await openOperations(open);

  await fillIssuance(page, '1.2345');
  await expect(trigger(page, 'Mirror issuance')).toBeDisabled();
  await page.getByLabel(/^Tonnes/u).fill('012.5');
  await expect(trigger(page, 'Mirror issuance')).toBeDisabled();
  await page.getByLabel(/^Tonnes/u).fill('0');
  await expect(trigger(page, 'Mirror issuance')).toBeDisabled();
});

/** The page reloaded (the login ends, D-7) and the person signed in again on the same campaign. */
const afterReload = async (page: Page): Promise<void> => {
  await page.reload();
  await signInWith(page, meBody(RAKA), {
    returnTo: '/app/operator/campaigns/0x0000000000000000000000000000000000000003',
  });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await tab(page, 'Mirror issuance').click();
};

const draftKeys = (page: Page): Promise<string[]> =>
  page.evaluate(() => Object.keys(sessionStorage).filter((key) => key.includes('treecord:draft:')));

test('#17 typed issuance fields and their key survive a reload; sign-out removes every draft', async ({
  open,
}) => {
  const { page, writes } = await openOperations(open, {
    write: (_call, before) =>
      before === 0
        ? failure(HTTP_UNAVAILABLE, 'service_unavailable')
        : { status: 202, body: job('issue', 'pending') },
  });

  await fillIssuance(page);
  await trigger(page, 'Mirror issuance').click();
  await confirm(page, 'Mirror issuance').click();
  await expect(review(page, 'Mirror issuance').getByRole('alert')).toBeVisible();
  await afterReload(page);
  await expect(page.getByLabel(/^Registry/u)).toHaveValue('SRN-PPI');
  await expect(page.getByLabel(/^Tonnes/u)).toHaveValue('12.5');
  await trigger(page, 'Mirror issuance').click();
  await confirm(page, 'Mirror issuance').click();
  await expect(callout(page)).toBeVisible();
  expect(writes[1]?.headers['idempotency-key']).toBe(writes[0]?.headers['idempotency-key']);
});

test('#17 (sign-out) no draft key is left once the person signs out', async ({ open }) => {
  const { page } = await openOperations(open);

  await fillIssuance(page);
  expect((await draftKeys(page)).length).toBeGreaterThan(0);
  await page.locator('summary[aria-label^="Account"]').click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible();
  expect(await draftKeys(page)).toEqual([]);
});

test('#18 a campaign with no batches says "No issued batches"', async ({ open }) => {
  const { page } = await openOperations(open);

  await tab(page, 'Inventory price').click();
  await expect(page.getByText('No issued batches')).toBeVisible();
});

const priceScene = (changes: Partial<Scene> = {}): Scene => ({
  address: MANGROVES,
  campaign: () => ops({ campaign: { address: MANGROVES } }),
  batches: () => [BATCH_101_ITEM],
  ...changes,
});

test('#19 batch 101 is listed with its current price and inventory', async ({ open }) => {
  const { page } = await openOperations(open, priceScene());

  await tab(page, 'Inventory price').click();
  await expect(page.getByLabel('Batch')).toContainText('#101 · SRN PPI · 2025');
  await expect(fact(page, 'Current price')).toHaveText('18.5 USDC / t');
  await expect(fact(page, 'Inventory')).toHaveText('8.400 tCO₂e');
});

test('#20 the price review and body for 15, 0 and an invalid 7-decimal price', async ({ open }) => {
  const { page, writes } = await openOperations(open, priceScene());
  const ask = page.getByLabel(/^Requested USDC per tonne/u);

  await tab(page, 'Inventory price').click();
  await ask.fill('1.1234567');
  await expect(trigger(page, 'Set inventory price')).toBeDisabled();
  await ask.fill('0');
  await expect(trigger(page, 'Set inventory price')).toBeEnabled();
  await ask.fill('15');
  await trigger(page, 'Set inventory price').click();
  await expect(review(page, 'Set inventory price')).toContainText(
    'Requested price 15 USDC / t. Current price remains until confirmation.',
  );
  await confirm(page, 'Set inventory price').click();
  await expect(callout(page)).toBeVisible();
  expect(writes[0]?.path).toBe('/operator/carbon/batches/101/price');
  expect(writes[0]?.body).toEqual({ usdcPerTonne: '15000000' });
});

test('#21 a confirmed price job leaves the current price until the batches say otherwise', async ({
  open,
}) => {
  let price = '18500000';
  const { page } = await openOperations(
    open,
    priceScene({
      batches: () => [{ ...BATCH_101_ITEM, usdcPerTonne: price }],
      job: () => job('set_price', 'confirmed'),
    }),
  );

  await tab(page, 'Inventory price').click();
  await page.getByLabel(/^Requested USDC per tonne/u).fill('15');
  await trigger(page, 'Set inventory price').click();
  await confirm(page, 'Set inventory price').click();
  await expect(callout(page)).toContainText('confirmed', { timeout: 15_000 });
  await expect(fact(page, 'Current price')).toHaveText('18.5 USDC / t');
  price = '15000000';
  await refocus(page);
  await expect(fact(page, 'Current price')).toHaveText('15 USDC / t');
});

test('#22 a failed job shows its tag and the last error', async ({ open }) => {
  const { page } = await openOperations(open, {
    job: () => job('anchor_assign', 'failed', { lastError: 'Worker failure' }),
  });

  await toReview(page);
  await confirm(page, 'Assign anchor slots').click();
  await expect(callout(page)).toContainText('failed', { timeout: 15_000 });
  await expect(callout(page)).toContainText('Last error');
  await expect(callout(page)).toContainText('Worker failure');
});

test('#23 a 409 campaign_not_active shows the sentence in the review and keeps the inputs', async ({
  open,
}) => {
  const { page } = await openOperations(open, {
    write: () => failure(HTTP_CONFLICT, 'campaign_not_active'),
  });

  await toReview(page);
  await confirm(page, 'Assign anchor slots').click();
  await expect(review(page, 'Assign anchor slots').getByRole('alert')).toContainText(
    'Campaign must be Active.',
  );
  await expect(wallet(page)).toHaveValue(WALLET);
  await expect(slots(page)).toHaveValue('3');
});

test('#24 "Open review" opens the trimmed submission id', async ({ open }) => {
  const { page } = await openOperations(open);

  await page.getByLabel('Submission ID').fill(' abc ');
  await page.getByRole('button', { name: 'Open review' }).click();
  await expect(page).toHaveURL(/\/app\/operator\/submissions\/abc$/u);
});

test('#25 offline, the callout shows and every action button and "Open review" are disabled', async ({
  open,
}) => {
  const { page } = await openOperations(open);

  await wallet(page).fill(WALLET);
  await page.getByLabel('Submission ID').fill('abc');
  await page.context().setOffline(true);
  await expect(page.getByText(OFFLINE)).toBeVisible();
  await expect(trigger(page, 'Assign anchor slots')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Open review' })).toBeDisabled();
});
