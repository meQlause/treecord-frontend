// docs/FE/features/s15-my-carbon.md §8, the wallet half: D09 Decline (#9-#12) and D10 Retire (#13-#18, #20), on a local anvil
// with the frozen contracts (helpers/chain.ts). The app signs with the test donor's key through the dev-server seam; the
// holdings are answered from what the ledger says (frozen while a spec shows "nothing changes before the indexer does");
// the retirement record answers 404 and then 200. The backend does not run. Ids differ from the fixture's: the campaign is
// a real one on anvil, and the app's retirement is #3 because two were made before the page opened.
import type { Page } from '@playwright/test';
import type { Address } from 'viem';
import type { Json } from './fixtures/campaigns';
import {
  MANGROVES,
  MANGROVES_RESERVATION,
  ROOTS_RESERVATION,
  balance,
  page as listing,
} from './fixtures/holdings';
import { retirement } from './fixtures/retirement';
import { failure } from './helpers/api';
import { carbonChain, type CarbonChain } from './helpers/carbon-chain';
import { expect, test, type Chain } from './helpers/chain';
import { openCarbon, type Scene, type Visit } from './helpers/my-carbon-page';

const TEST_MS = 180_000;
const NOT_FOUND = 404;
const START = 2200n;
const RETIRED_BEFORE = 400n;
const ROOTS_UNFILLED = 533n;
const DRAFT = 'treecord:draft:carbon-retire:';

test.describe.configure({ timeout: TEST_MS });

const dialog = (page: Page) => page.getByRole('dialog');

const confirm = (page: Page) => dialog(page).getByRole('button', { name: 'Confirm in wallet' });

const card = (page: Page) => page.locator('.campaign-card').first();

const figure = (page: Page, label: string) =>
  page.locator('.mc-figures > div').filter({ has: page.getByText(label, { exact: true }) });

const amount = (page: Page) => dialog(page).getByLabel('Amount · tCO₂e');

const beneficiary = (page: Page) => dialog(page).getByLabel('Beneficiary');

const purpose = (page: Page) => dialog(page).getByLabel('Purpose');

/** The holdings as the chain says them now, or as they were when `freeze` was called. */
type Frozen = { body: Json | null };

const hold = (frozen: Frozen, read: () => Promise<Json>) => async (): Promise<Json> =>
  frozen.body ?? read();

/** D09's holdings: Roots that stay as in the fixture, and the mangroves reservation as the ledger holds it. */
const reservationsOf = (carbon: CarbonChain, campaign: Address) => async (): Promise<Json> => {
  const { reserved, allocated, declined } = await carbon.reservation(campaign);
  const unfilled = reserved - allocated;

  return {
    summary: {
      issuedAmount: '0',
      allocatedAmount: String(allocated),
      unfilledAmount: String(unfilled + ROOTS_UNFILLED),
      retiredAmount: '0',
    },
    reservations: [
      {
        ...MANGROVES_RESERVATION,
        campaign: { ...MANGROVES, address: campaign },
        reservedAmount: String(reserved),
        allocatedAmount: String(allocated),
        unfilledAmount: String(unfilled),
        declined,
      },
      ROOTS_RESERVATION,
    ],
    balances: [],
    retirements: listing([], 0),
  };
};

/** D10's holdings: batch 101 as the donor holds it on the ledger, 0.400 retired before the page opened. */
const balanceOf =
  (chain: Chain, batch: { batchId: string; campaign: Address }) => async (): Promise<Json> => {
    const { held } = await chain.carbonState(batch.batchId);
    const retired = RETIRED_BEFORE + START - held;

    return {
      summary: {
        issuedAmount: String(held),
        allocatedAmount: '0',
        unfilledAmount: '0',
        retiredAmount: String(retired),
      },
      reservations: [],
      balances: [
        balance(
          String(held),
          String(retired),
          { ...MANGROVES, address: batch.campaign },
          batch.batchId,
        ),
      ],
      retirements: listing([], 0),
    };
  };

type Opened = { visit: Visit; frozen: Frozen };

const openDecline = async (
  open: Parameters<typeof openCarbon>[0],
  carbon: CarbonChain,
  campaign: Address,
): Promise<Opened> => {
  const frozen: Frozen = { body: null };
  const visit = await openCarbon(open, {
    holdings: hold(frozen, reservationsOf(carbon, campaign)),
  });

  await visit.page.getByRole('button', { name: 'Reservations', exact: true }).click();

  return { visit, frozen };
};

const startDecline = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Decline unfilled share' }).first().click();
  await dialog(page).getByRole('button', { name: 'Review' }).click();
};

const openRetire = async (
  open: Parameters<typeof openCarbon>[0],
  chain: Chain,
  batch: { batchId: string; campaign: Address },
  record?: Scene['record'],
): Promise<Opened> => {
  const frozen: Frozen = { body: null };
  const visit = await openCarbon(open, {
    holdings: hold(frozen, balanceOf(chain, batch)),
    ...(record === undefined ? {} : { record }),
  });

  await expect(card(visit.page)).toContainText('2.200 tCO₂e to retire');

  return { visit, frozen };
};

const fillRetire = async (page: Page, text = '0.500'): Promise<void> => {
  await page.getByRole('button', { name: 'Retire credits' }).click();
  await amount(page).fill(text);
  await beneficiary(page).fill('PT Hijau Lestari');
  await purpose(page).fill('2026 scope 3 offset');
};

/** S09's record: 404 until the indexer has it, then the example body for `id`. */
const indexedAfterOne = (): NonNullable<Scene['record']> => {
  let reads = 0;

  return (id) => {
    reads += 1;

    return reads === 1
      ? failure(NOT_FOUND, 'not_found')
      : retirement({ retirementId: id, amount: '500' });
  };
};

test('#9 "Decline unfilled share" opens "Release your reservation." and Review names what is released', async ({
  open,
  chain,
}) => {
  const carbon = carbonChain(chain);
  const { visit } = await openDecline(open, carbon, await carbon.reserve());
  const { page } = visit;

  await page.getByRole('button', { name: 'Decline unfilled share' }).first().click();
  await expect(dialog(page)).toContainText('Release your reservation.');
  await expect(dialog(page)).toContainText('Back to the mangroves');
  await expect(dialog(page)).toContainText('0.400');
  await expect(dialog(page)).toContainText('tCO₂e');
  await expect(dialog(page)).toContainText('Only the unfilled reservation is released.');
  await dialog(page).getByRole('button', { name: 'Review' }).click();
  await expect(dialog(page)).toContainText('0.400 tCO₂e');
  await expect(dialog(page)).toContainText(
    'This releases the unfilled claim; issued allocations are unchanged.',
  );
  await expect(dialog(page)).toContainText('Ready to confirm in your wallet.');
});

test('#10 a double click on "Confirm in wallet" sends one declineReservation; Close and Escape stay shut', async ({
  open,
  chain,
}) => {
  const carbon = carbonChain(chain);
  const campaign = await carbon.reserve();
  const { visit, frozen } = await openDecline(open, carbon, campaign);
  const { page, rpc } = visit;

  frozen.body = await reservationsOf(carbon, campaign)();
  await startDecline(page);
  await confirm(page).dblclick();
  await expect(dialog(page).getByRole('status')).toHaveText('Confirming…');
  await expect(dialog(page).getByRole('button', { name: 'Close' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole('status')).toHaveText('Confirmed · Updating balances…');
  expect(rpc.sent()).toBe(1);
  expect((await carbon.reservation(campaign)).declined).toBe(true);
});

const expectReleased = async (page: Page): Promise<void> => {
  await expect(page.getByText('Unfilled reservation released')).toBeVisible();
  await expect(dialog(page)).toHaveCount(0);
  await expect(card(page)).toContainText('Declined');
  await expect(card(page)).toContainText('0.000 tCO₂e unfilled');
  await expect(card(page)).toContainText('1.600 tCO₂e issued to you');
  await expect(card(page).getByRole('button', { name: 'Unfilled share released' })).toBeDisabled();
  await expect(figure(page, 'Reserved')).toContainText('0.533');
};

test('#11 the card changes only when the holdings do: then the dialog closes, a toast shows and Reserved reads 0.533', async ({
  open,
  chain,
}) => {
  const carbon = carbonChain(chain);
  const campaign = await carbon.reserve();
  const { visit, frozen } = await openDecline(open, carbon, campaign);
  const { page } = visit;

  frozen.body = await reservationsOf(carbon, campaign)();
  await startDecline(page);
  await confirm(page).click();
  await expect(dialog(page).getByRole('status')).toHaveText('Confirmed · Updating balances…');
  await expect(card(page)).toContainText('0.400 tCO₂e unfilled');
  await expect(card(page)).not.toContainText('Declined');
  frozen.body = null;
  await expectReleased(page);
});

test('#12 a rejecting wallet and a reverted decline each say so, change nothing, and leave Close working', async ({
  open,
  chain,
}) => {
  const carbon = carbonChain(chain);
  const campaign = await carbon.reserve();
  const { visit } = await openDecline(open, carbon, campaign);
  const { page, rpc } = visit;

  await startDecline(page);
  rpc.refuseNext();
  await confirm(page).click();
  await expect(dialog(page)).toContainText('Wallet rejected. Nothing changed.');
  await expect(card(page)).toContainText('0.400 tCO₂e unfilled');
  rpc.revertReceipts();
  await confirm(page).click();
  await expect(dialog(page)).toContainText('Transaction failed. Nothing changed.');
  await expect(card(page)).toContainText('0.400 tCO₂e unfilled');
  await dialog(page).getByRole('button', { name: 'Close' }).click();
  await expect(dialog(page)).toHaveCount(0);
});

test('#13 "Retire credits" opens "Make it count." with the balance of batch 101', async ({
  open,
  chain,
}) => {
  const carbon = carbonChain(chain);
  const { visit } = await openRetire(open, chain, await carbon.hold());
  const { page } = visit;

  await page.getByRole('button', { name: 'Retire credits' }).click();
  await expect(dialog(page)).toContainText('Make it count.');
  await expect(dialog(page)).toContainText('Batch #1 · 2.200 tCO₂e available');
});

test('#14 an amount past the balance or with 4 decimals, and a blank beneficiary, are told off', async ({
  open,
  chain,
}) => {
  const carbon = carbonChain(chain);
  const { visit } = await openRetire(open, chain, await carbon.hold());
  const { page } = visit;
  const rule = 'Enter a positive amount within your balance, up to 3 decimals.';

  await fillRetire(page, '2.2001');
  await dialog(page).getByRole('button', { name: 'Review' }).click();
  await expect(dialog(page).getByRole('alert')).toHaveText(rule);
  await amount(page).fill('2.201');
  await dialog(page).getByRole('button', { name: 'Review' }).click();
  await expect(dialog(page).getByRole('alert')).toHaveText(rule);
  await amount(page).fill('0.500');
  await beneficiary(page).fill('   ');
  await dialog(page).getByRole('button', { name: 'Review' }).click();
  await expect(dialog(page).getByRole('alert')).toHaveText('Enter a beneficiary.');
});

test('#15 Review names the retirement; a double click sends one retire and no USDC approval', async ({
  open,
  chain,
}) => {
  const carbon = carbonChain(chain);
  const batch = await carbon.hold();
  const { visit } = await openRetire(open, chain, batch, indexedAfterOne());
  const { page, rpc } = visit;

  await fillRetire(page);
  await dialog(page).getByRole('button', { name: 'Review' }).click();
  await expect(dialog(page)).toContainText('0.500 tCO₂e');
  await expect(dialog(page)).toContainText('For PT Hijau Lestari · 2026 scope 3 offset');
  await expect(dialog(page)).toContainText(
    'Retirement permanently reduces the issued balance. Registry retirement remains a separate, pending step.',
  );
  await confirm(page).dblclick();
  await expect.poll(async () => (await chain.carbonState(batch.batchId)).held).toBe(1700n);
  expect(rpc.sent()).toBe(1);
  expect(await carbon.retirementCount()).toBe(3n);
});

test('#16 the page waits for the record (404, then 200), opens it, and S15 reads the new balance', async ({
  open,
  chain,
}) => {
  const carbon = carbonChain(chain);
  const { visit } = await openRetire(open, chain, await carbon.hold(), indexedAfterOne());
  const { page } = visit;

  await fillRetire(page);
  await dialog(page).getByRole('button', { name: 'Review' }).click();
  await confirm(page).click();
  await expect(dialog(page).getByRole('status')).toHaveText('Confirmed · Updating balances…');
  await page.waitForURL('**/carbon/retirements/3');
  await page.goBack();
  await expect(card(page)).toContainText('1.700 tCO₂e to retire');
  await expect(card(page)).toContainText('0.900 tCO₂e retired so far');
  await expect(card(page)).toContainText('65%');
  await expect(figure(page, 'Issued')).toContainText('1.700');
  await expect(figure(page, 'Retired')).toContainText('0.900');
});

test('#17 a rejecting wallet says so and the balance still reads 2.200', async ({
  open,
  chain,
}) => {
  const carbon = carbonChain(chain);
  const batch = await carbon.hold();
  const { visit } = await openRetire(open, chain, batch);
  const { page, rpc } = visit;

  await fillRetire(page);
  await dialog(page).getByRole('button', { name: 'Review' }).click();
  rpc.refuseNext();
  await confirm(page).click();
  await expect(dialog(page)).toContainText('Wallet rejected. Nothing changed.');
  await expect(card(page)).toContainText('2.200 tCO₂e to retire');
  expect((await chain.carbonState(batch.batchId)).held).toBe(START);
});

const draftKeys = (page: Page): Promise<string[]> =>
  page.evaluate(
    (prefix) =>
      [...Object.keys(sessionStorage), ...Object.keys(localStorage)].filter((key) =>
        key.startsWith(prefix),
      ),
    DRAFT,
  );

test('#18 the typed values survive closing and reopening; no draft key remains once the retirement is indexed', async ({
  open,
  chain,
}) => {
  const carbon = carbonChain(chain);
  const { visit } = await openRetire(open, chain, await carbon.hold(), indexedAfterOne());
  const { page } = visit;

  await fillRetire(page);
  await dialog(page).getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Retire credits' }).click();
  await expect(amount(page)).toHaveValue('0.500');
  await expect(beneficiary(page)).toHaveValue('PT Hijau Lestari');
  expect(await draftKeys(page)).toHaveLength(1);
  await dialog(page).getByRole('button', { name: 'Review' }).click();
  await confirm(page).click();
  await page.waitForURL('**/carbon/retirements/3');
  expect(await draftKeys(page)).toHaveLength(0);
});

test('#20 "Back to edit" returns the filled form (D10) or the release block (D09) and sends nothing', async ({
  open,
  chain,
}) => {
  const carbon = carbonChain(chain);
  const { visit } = await openRetire(open, chain, await carbon.hold());
  const { page, rpc } = visit;

  await fillRetire(page);
  await dialog(page).getByRole('button', { name: 'Review' }).click();
  await dialog(page).getByRole('button', { name: 'Back to edit' }).click();
  await expect(amount(page)).toHaveValue('0.500');
  await expect(beneficiary(page)).toHaveValue('PT Hijau Lestari');
  await expect(purpose(page)).toHaveValue('2026 scope 3 offset');
  await dialog(page).getByRole('button', { name: 'Review' }).click();
  await expect(dialog(page)).toContainText('For PT Hijau Lestari · 2026 scope 3 offset');
  expect(rpc.sent()).toBe(0);
});

test('#20 (D09) "Back to edit" returns the release block and Review', async ({ open, chain }) => {
  const carbon = carbonChain(chain);
  const { visit } = await openDecline(open, carbon, await carbon.reserve());
  const { page, rpc } = visit;

  await startDecline(page);
  await dialog(page).getByRole('button', { name: 'Back to edit' }).click();
  await expect(dialog(page)).toContainText('Only the unfilled reservation is released.');
  await expect(dialog(page).getByRole('button', { name: 'Review' })).toBeVisible();
  expect(rpc.sent()).toBe(0);
});
