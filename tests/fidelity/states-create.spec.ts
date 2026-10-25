// The UI-gap states of Phase F4a that belong to S14 (docs/FE/ui-gaps-treatments.md §3): an operator creating a campaign on
// a donor's behalf (pattern 27, the creator field) and the phone viewport (pattern 18, CC-21: the focused field is scrolled to
// the middle so the keyboard never hides the action under it). Same stage as s14-create-campaign.flow.spec.ts.
import { createPublicClient, http, type Address } from 'viem';
import { foundry } from 'viem/chains';
import type { Page } from '@playwright/test';
import { campaignAbi } from '../../src/shared/chain/abis';
import { SARI } from './fixtures/accounts';
import { expect, test, OPERATOR_KEY } from './helpers/chain';
import { ALEX, openCreate, type Visit } from './helpers/create-page';

const TEST_MS = 180_000;
const RPC = 'http://127.0.0.1:8545';
const OPERATOR_WALLET = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const BEHALF_OF = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const MIDDLE_TOLERANCE_PX = 120;

test.describe.configure({ timeout: TEST_MS });

const RAKA = {
  ...SARI,
  role: 'operator' as const,
  displayName: 'Raka',
  walletAddress: OPERATOR_WALLET,
};

const field = (page: Page, label: string) => page.getByLabel(label, { exact: true });

const press = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click();

const creatorField = (page: Page) => page.locator('#cc-creator');

/** Raka on the Demak inputs, step 2 with the dates filled: ready to type the creator. */
const operatorAtFunding = async (open: Parameters<typeof openCreate>[0]): Promise<Visit> => {
  const visit = await openCreate(open, { profile: RAKA, signer: OPERATOR_KEY });
  const { page } = visit;

  await field(page, 'Campaign title').fill('A new tide for Demak');
  await page.getByLabel('Species').selectOption({ label: 'Rhizophora mangrove' });
  await field(page, 'Region').fill('Demak, Central Java');
  await field(page, 'Center latitude').fill('-6.894');
  await field(page, 'Center longitude').fill('110.638');
  await press(page, 'Continue');
  await field(page, 'Funding deadline').fill('2026-12-01T10:00');
  await field(page, 'Claim deadline').fill('2026-12-15T10:00');

  return visit;
};

test('pattern 27 operator on behalf S14: only an operator sees the creator field, which starts as their own wallet', async ({
  open,
}) => {
  const { page } = await operatorAtFunding(open);

  await expect(creatorField(page)).toHaveValue(OPERATOR_WALLET);
  await expect(page.locator('[data-copy="COPY-418"]')).toBeVisible();
  await expect(page.locator('[data-copy="COPY-419"]')).toBeVisible();
});

test('pattern 27 operator on behalf S14: a typed wallet becomes the creator of the campaign on the chain', async ({
  open,
}) => {
  const { page } = await operatorAtFunding(open);

  await creatorField(page).fill(BEHALF_OF);
  await press(page, 'Review campaign');
  await expect(page.locator('.cc-review dd', { hasText: BEHALF_OF })).toBeVisible();
  await press(page, 'Create campaign');

  const href =
    (await page
      .getByRole('link', { name: 'View campaign' })
      .getAttribute('href', { timeout: 60_000 })) ?? '';
  const config = await createPublicClient({ chain: foundry, transport: http(RPC) }).readContract({
    address: href.replace('/campaigns/', '') as Address,
    abi: campaignAbi,
    functionName: 'config',
  });

  expect(config.creator.toLowerCase()).toBe(BEHALF_OF.toLowerCase());
});

test('pattern 27 operator on behalf S14: a donor has no creator field', async ({ open }) => {
  const { page } = await openCreate(open, { profile: ALEX });

  await field(page, 'Campaign title').fill('A new tide for Demak');
  await page.getByLabel('Species').selectOption({ label: 'Rhizophora mangrove' });
  await field(page, 'Region').fill('Demak, Central Java');
  await field(page, 'Center latitude').fill('-6.894');
  await field(page, 'Center longitude').fill('110.638');
  await press(page, 'Continue');
  await expect(field(page, 'Funding target · USDC')).toBeVisible();
  await expect(creatorField(page)).toHaveCount(0);
});

test('pattern 18 viewport S14 CC-21: at 360 px a focused field is scrolled to the middle of the screen', async ({
  open,
}) => {
  const { page } = await openCreate(open, { profile: ALEX });
  const radius = field(page, 'Radius · meters');

  await radius.focus();
  await expect(async () => {
    const box = await radius.boundingBox();
    const height = page.viewportSize()?.height ?? 0;
    const offset = Math.abs((box?.y ?? 0) + (box?.height ?? 0) / 2 - height / 2);

    expect(offset).toBeLessThanOrEqual(MIDDLE_TOLERANCE_PX);
  }).toPass();
});
