// docs/FE/features/s14-create-campaign.md §7: one test per criterion #1..#20, in the browser, under the docs/FE/fidelity.md §2
// conditions. Sign-in uses the real Privy test account (backend/.env); `GET /species`, `POST /campaigns/metadata` and
// `GET /campaigns/:address` are answered by the spec (the backend does not run). The factory is the real one on a local anvil
// (helpers/chain.ts) and the app signs with the test donor's key through the dev-server seam, so what the wallet was asked
// for is read back from the new campaign's own config.
import { createPublicClient, http, type Address } from 'viem';
import { foundry } from 'viem/chains';
import type { Page } from '@playwright/test';
import { campaignAbi } from '../../src/shared/chain/abis';
import { failure } from './helpers/api';
import { expect, test } from './helpers/chain';
import {
  ALEX,
  METADATA_URI,
  PLANTER,
  openCreate,
  type Scene,
  type Visit,
} from './helpers/create-page';
import { meBody } from './fixtures/accounts';
import { settle, signInWith } from './helpers/flow';

const TEST_MS = 180_000;
const CATALOG_MS = 20_000;
const RPC = 'http://127.0.0.1:8545';
const DEMAK_BODY = {
  title: 'A new tide for Demak',
  description: '',
  speciesCode: 'RHIZOPHORA_MUCRONATA',
  regionName: 'Demak, Central Java',
  regionCenter: { lat: -6.894, lon: 110.638 },
  regionRadiusM: 2500,
  imageUrls: [],
};

test.describe.configure({ timeout: TEST_MS });

const title = (page: Page, text: string) => page.getByRole('heading', { name: text, level: 2 });

const field = (page: Page, label: string) => page.getByLabel(label, { exact: true });

const navButton = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Campaign creation steps' }).getByRole('button', { name });

const press = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click();

/** Step 1 with the Demak inputs, overridden by `changes`; the page stays on step 1. */
const fillInfo = async (
  page: Page,
  changes: Partial<Record<'title' | 'region' | 'radius', string>> = {},
): Promise<void> => {
  await field(page, 'Campaign title').fill(changes.title ?? 'A new tide for Demak');
  await page.getByLabel('Species').selectOption({ label: 'Rhizophora mangrove' });
  await field(page, 'Region').fill(changes.region ?? 'Demak, Central Java');
  await field(page, 'Center latitude').fill('-6.894');
  await field(page, 'Center longitude').fill('110.638');
  await field(page, 'Radius · meters').fill(changes.radius ?? '2500');
};

/** Step 1 with the Demak inputs, ending on step 2. */
const toFunding = async (
  page: Page,
  changes: Partial<Record<'title' | 'region' | 'radius', string>> = {},
): Promise<void> => {
  await fillInfo(page, changes);
  await press(page, 'Continue');
};

const dates = async (
  page: Page,
  funding = '2026-12-01T10:00',
  claim = '2026-12-15T10:00',
): Promise<void> => {
  await field(page, 'Funding deadline').fill(funding);
  await field(page, 'Claim deadline').fill(claim);
};

/** The wizard open at step 1 as Alex. */
const start = async (open: Parameters<typeof openCreate>[0], scene: Scene = {}): Promise<Visit> => {
  const visit = await openCreate(open, scene);

  await expect(title(visit.page, 'Give it a place to grow.')).toBeVisible();

  return visit;
};

/** The Demak inputs on step 3, ready to press "Create campaign". */
const atReview = async (
  open: Parameters<typeof openCreate>[0],
  scene: Scene = {},
): Promise<Visit> => {
  const visit = await start(open, scene);

  await toFunding(visit.page);
  await dates(visit.page);
  await press(visit.page, 'Review campaign');
  await expect(title(visit.page, 'A final look.')).toBeVisible();

  return visit;
};

const chainOfCampaign = async (page: Page) => {
  const href = (await page.getByRole('link', { name: 'View campaign' }).getAttribute('href')) ?? '';
  const client = createPublicClient({ chain: foundry, transport: http(RPC) });

  return client.readContract({
    address: href.replace('/campaigns/', '') as Address,
    abi: campaignAbi,
    functionName: 'config',
  });
};

/** What the wallet was asked for: the saved metadata, 10,000 USDC, a 25% anchor and the default split. */
const expectDemakConfig = async (page: Page): Promise<void> => {
  const config = await chainOfCampaign(page);

  expect(config.metadataURI).toBe(METADATA_URI);
  expect(config.fundingTarget).toBe(10_000_000_000n);
  expect(config.anchorBps).toBe(2500);
  expect(Object.values(config.split)).toEqual([7000, 1000, 500, 1000, 500]);
};

test('#1 a planter gets "Role unavailable" and no species read or save is sent', async ({
  open,
}) => {
  const { page, calls } = await openCreate(open, { profile: PLANTER });

  await expect(page.getByText('Role unavailable')).toBeVisible();
  await settle(page);
  expect(calls.filter(({ path }) => path === '/species' || path === '/campaigns/metadata')).toEqual(
    [],
  );
});

test('#2 an empty title stops Continue with the alert, its focus and the rule under the field', async ({
  open,
}) => {
  const { page } = await start(open);

  await press(page, 'Continue');

  const alert = page.getByRole('alert').first();

  await expect(alert).toHaveText('Check the highlighted fields before continuing.');
  await expect(alert).toBeFocused();
  await expect(page.locator('#error-title')).toHaveText('Use 3–120 characters.');
  await expect(page.getByText('STEP 02')).toHaveCount(0);
});

test('#3 a radius of 50 is told off under its field and keeps its value', async ({ open }) => {
  const { page } = await start(open);

  await toFunding(page, { radius: '50' });
  await expect(page.locator('#error-radius')).toHaveText(
    'Enter a whole number from 100 to 100000.',
  );
  await expect(page.locator('#cc-radius')).toHaveValue('50');
});

test('#4 the default shares read 75.00% open and 7,000 / 1,000 / 500 / 1,000 / 500 USDC, totalling 100%', async ({
  open,
}) => {
  const { page } = await start(open);

  await toFunding(page);
  await expect(page.locator('.cc-readonly')).toContainText('75.00%');
  await expect(page.locator('.cc-budget-inputs label small')).toHaveText([
    '7,000 USDC',
    '1,000 USDC',
    '500 USDC',
    '1,000 USDC',
    '500 USDC',
  ]);
  await expect(page.getByText('Total: 100.00% / 100%')).toBeVisible();
});

test('#5 a commitment of 24 months is told off on "Review campaign"', async ({ open }) => {
  const { page } = await start(open);

  await toFunding(page);
  await dates(page);
  await field(page, 'Commitment · months').fill('24');
  await press(page, 'Review campaign');
  await expect(page.locator('#error-months')).toHaveText('Enter a whole number from 36 to 65535.');
});

test('#6 shares of 70 / 10 / 5 / 10 / 4.5 are refused and the total reads 99.50%', async ({
  open,
}) => {
  const { page } = await start(open);

  await toFunding(page);
  await dates(page);
  await page.getByLabel('Replacement reserve percent').fill('10');
  await page.getByLabel('Platform fee percent').fill('4.5');
  await press(page, 'Review campaign');
  await expect(
    page.getByRole('alert').filter({ hasText: 'All five shares must total' }),
  ).toHaveText('All five shares must total exactly 100% (up to 2 decimals each).');
  await expect(page.getByText('Total: 99.50% / 100%')).toBeVisible();
});

test('#7 a target of 10000.000001 puts the odd micro-USDC in the replacement reserve and sums to the target', async ({
  open,
}) => {
  const { page } = await start(open);

  await toFunding(page);
  await field(page, 'Funding target · USDC').fill('10000.000001');
  await expect(page.locator('.cc-budget-inputs label small')).toHaveText([
    '7,000 USDC',
    '1,000 USDC',
    '500 USDC',
    '1,000.000001 USDC',
    '500 USDC',
  ]);
});

test('#8 a target of 0.000999 over 1000 trees leaves no incentive per tree, and says so', async ({
  open,
}) => {
  const { page } = await start(open);

  await toFunding(page);
  await dates(page);
  await field(page, 'Funding target · USDC').fill('0.000999');
  await press(page, 'Review campaign');
  await expect(page.locator('#error-target')).toHaveText(
    'Increase funding or incentives: incentives per tree must be non-zero.',
  );
});

test('#9 a past funding deadline and an earlier claim deadline are both refused', async ({
  open,
}) => {
  const { page } = await start(open);

  await toFunding(page);
  await dates(page, '2026-01-01T10:00', '2025-12-01T10:00');
  await press(page, 'Review campaign');
  await expect(page.locator('#error-funding')).toHaveText('Choose a future funding deadline.');
  await expect(page.locator('#error-claim')).toHaveText(
    'Claim deadline must be on or after funding deadline.',
  );
});

test('#10 step 2 names the viewer’s time zone', async ({ open }) => {
  const { page } = await start(open);

  await toFunding(page);
  await expect(page.getByText('Your local time · Asia/Jakarta')).toBeVisible();
});

test('#11 "Create campaign" saves the metadata once, then asks the wallet for the config it describes', async ({
  open,
}) => {
  const gate = Promise.withResolvers<void>();
  const visit = await atReview(open, {
    metadata: () =>
      gate.promise.then(() => ({ status: 201, body: { id: 'x', metadataURI: METADATA_URI } })),
  });
  const { page, rpc, posts } = visit;
  const release = rpc.hold('send');

  await press(page, 'Create campaign');
  await expect(page.getByText('Saving campaign details…')).toBeVisible();
  gate.resolve();
  await expect(page.getByText('Confirm in your wallet')).toBeVisible();
  release();
  await expect(page.getByRole('link', { name: 'View campaign' })).toBeVisible();

  expect(posts).toEqual([DEMAK_BODY]);
  await expectDemakConfig(page);
});

test('#12 a rejected wallet keeps the inputs; pressing again saves nothing twice and reuses the metadata URI', async ({
  open,
}) => {
  const { page, rpc, posts } = await atReview(open);

  rpc.refuseNext();
  await press(page, 'Create campaign');
  await expect(page.getByText('Wallet rejected. Your inputs are preserved.')).toBeVisible();
  await press(page, 'Create campaign');
  await expect(page.getByRole('link', { name: 'View campaign' })).toBeVisible();
  expect(posts).toHaveLength(1);
  expect((await chainOfCampaign(page)).metadataURI).toBe(METADATA_URI);
});

test('#13 after the receipt the page waits for the catalog (404, 404, 200), then shows the new campaign', async ({
  open,
}) => {
  const { page } = await atReview(open, {
    found: (read) => (read <= 2 ? failure(404, 'not_found') : { body: { campaign: {} } }),
  });

  await press(page, 'Create campaign');
  await expect(page.getByText('Confirmed · Adding it to the catalog…')).toBeVisible();
  // the catalog answers on the third look, after the 2 s and 3 s waits
  await expect(page.getByRole('heading', { name: 'A new beginning.' })).toBeVisible({
    timeout: CATALOG_MS,
  });
  await expect(page.getByText('A new tide for Demak', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Your campaign is in the catalog and open for funding.'),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'View campaign' })).toHaveAttribute(
    'href',
    /^\/campaigns\/0x/u,
  );
  await expect(page.getByText('Campaign created', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((key) => key.includes('create-campaign')),
    ),
  ).toEqual([]);
});

test('#14 a reverted transaction says so and every input keeps its value', async ({ open }) => {
  const { page, rpc } = await atReview(open);

  rpc.revertReceipts();
  await press(page, 'Create campaign');
  await expect(page.getByText('Transaction failed. Your inputs are preserved.')).toBeVisible();
  await page.getByRole('button', { name: 'Edit' }).first().click();
  await expect(field(page, 'Campaign title')).toHaveValue('A new tide for Demak');
  await expect(field(page, 'Region')).toHaveValue('Demak, Central Java');
});

test('#15 while the wallet is asked, the step nav, "Back" and the fields are all disabled', async ({
  open,
}) => {
  const { page, rpc } = await atReview(open);
  const release = rpc.hold('send');

  await press(page, 'Create campaign');
  await expect(page.getByText('Confirm in your wallet')).toBeVisible();

  for (const name of ['Campaign information', 'Funding & schedule', 'Review']) {
    await expect(navButton(page, name)).toBeDisabled();
  }

  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeDisabled();
  release();
});

test('#16 the preview reads "Your next forest." until something is typed, and shows the defaults', async ({
  open,
}) => {
  const { page } = await start(open);
  const preview = page.locator('.cc-preview');

  await expect(preview).toContainText('Your next forest.');
  await expect(preview).toContainText('Choose a region');
  await expect(preview).toContainText('10,000');
  await expect(preview).toContainText('1,000');
  await expect(preview).toContainText('36 months');
});

test('#17 the draft survives a reload and goes away on sign-out', async ({ open }) => {
  const { page } = await start(open);

  await toFunding(page);
  await field(page, 'Funding target · USDC').fill('12345');
  // a reload ends the login (D-7): the person signs in again and finds the same step and values
  await page.reload();
  await signInWith(page, meBody(ALEX), { returnTo: '/app/campaigns/new' });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await expect(title(page, 'Plan for the long run.')).toBeVisible();
  await expect(field(page, 'Funding target · USDC')).toHaveValue('12345');
  await page.locator('summary[aria-label^="Account"]').click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((key) => key.includes('treecord:draft:')),
    ),
  ).toEqual([]);
});

test('#18 at 360 px step 2 does not scroll sideways', async ({ open }) => {
  const { page } = await start(open);

  await toFunding(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test('#19 Edit, Back and the step nav move between steps and keep the values; "Back to review" returns to step 3', async ({
  open,
}) => {
  const { page } = await atReview(open);

  await page.getByRole('button', { name: 'Edit' }).nth(1).click();
  await expect(title(page, 'Plan for the long run.')).toBeVisible();
  await press(page, 'Back');
  await expect(page.getByText('STEP 01')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeDisabled();
  await expect(navButton(page, 'Funding & schedule')).toBeDisabled();
  await expect(navButton(page, 'Review')).toBeDisabled();
  await press(page, 'Continue');
  await navButton(page, 'Campaign information').click();
  await expect(field(page, 'Campaign title')).toHaveValue('A new tide for Demak');
});

test('#19 "Back to review" after a created campaign returns to step 3 with "Create campaign" enabled', async ({
  open,
}) => {
  const { page } = await atReview(open);

  await press(page, 'Create campaign');
  await expect(page.getByRole('heading', { name: 'A new beginning.' })).toBeVisible({
    timeout: CATALOG_MS,
  });
  await press(page, 'Back to review');
  await expect(title(page, 'A final look.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create campaign' })).toBeEnabled();
});

test('#20 each step title takes the focus, and the page is back at the top', async ({ open }) => {
  const { page } = await start(open);

  await fillInfo(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await press(page, 'Continue');
  await expect(title(page, 'Plan for the long run.')).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await press(page, 'Back');
  await expect(title(page, 'Give it a place to grow.')).toBeFocused();
});
