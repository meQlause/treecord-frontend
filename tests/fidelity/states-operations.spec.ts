// The UI-gap states of Phase F4b (docs/FE/ui-gaps-treatments.md §3): conflict (5) on S27 and S29 and confirm (11) on S29 uphold.
// A conflict is a 409 on Confirm: a banner inside the review, Confirm kept shut where nothing can change it, and a re-read so the
// page shows the new truth. Instances another spec already proves: S27 `campaign_not_active` (s27 #23), S28 `cannot_attest` and
// `not_in_review` (s28 #8, #9), S29 `flag_resolution_pending` (s29 #10).
import type { Page } from '@playwright/test';
import { FLAG_OPEN, ROOTS_OPS, flagWith, ops } from './fixtures/operations';
import { failure } from './helpers/api';
import { openFlag } from './helpers/flag-page';
import { expect, refocus, test } from './helpers/flow';
import { openOperations, type Scene } from './helpers/operations-page';

const TEST_MS = 120_000;
const HTTP_CONFLICT = 409;
const WALLET = '0x4B9E2c1D7a3F5e8B0c6D9a2E4f1b3C5d7E9f9D0e';
const NOTE = 'Site visit confirmed the tree is alive and in place';

test.describe.configure({ timeout: TEST_MS });

const tab = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

const trigger = (page: Page, name: string) =>
  page.locator('section.ws-panel').getByRole('button', { name, exact: true });

const review = (page: Page, name: string) => page.getByRole('region', { name: `Review ${name}` });

const confirm = (page: Page, name: string) =>
  review(page, name).getByRole('button', { name: 'Confirm' });

/** The estimate tab, "Compute & set estimate" pressed and confirmed against a refusal with `code`. */
const computeRefused = async (
  open: Parameters<typeof openOperations>[0],
  code: string,
  scene: Scene = {},
  onRefuse: () => void = () => undefined,
): Promise<Page> => {
  const { page } = await openOperations(open, {
    ...scene,
    write: () => {
      onRefuse();

      return failure(HTTP_CONFLICT, code);
    },
  });

  await tab(page, 'Carbon estimate').click();
  await trigger(page, 'Compute & set estimate').click();
  await confirm(page, 'Compute & set estimate').click();

  return page;
};

test('pattern 5 conflict S27 estimate_locked: the sentence shows, Confirm is shut, and the re-read keeps the line', async ({
  open,
}) => {
  let locked = false;
  const page = await computeRefused(
    open,
    'estimate_locked',
    { campaign: () => (locked ? ops({ estimate: { locked: true } }) : ROOTS_OPS) },
    () => {
      locked = true;
    },
  );

  await expect(review(page, 'Compute & set estimate').getByRole('alert')).toContainText(
    'Estimate locked after first issuance.',
  );
  await expect(confirm(page, 'Compute & set estimate')).toBeDisabled();
  await review(page, 'Compute & set estimate').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('.op-line')).toHaveText('Estimate locked after first issuance.');
  await expect(trigger(page, 'Compute & set estimate')).toBeDisabled();
});

test('pattern 5 conflict S27 species_unknown: the registry sentence shows and Confirm is shut', async ({
  open,
}) => {
  const page = await computeRefused(open, 'species_unknown');

  await expect(review(page, 'Compute & set estimate').getByRole('alert')).toBeVisible();
  await expect(
    review(page, 'Compute & set estimate').locator('[data-copy="COPY-017"]'),
  ).toBeVisible();
  await expect(confirm(page, 'Compute & set estimate')).toBeDisabled();
});

test('pattern 5 conflict S27 campaign_not_issuable: the registry sentence shows and the typed fields stay', async ({
  open,
}) => {
  const { page } = await openOperations(open, {
    write: () => failure(HTTP_CONFLICT, 'campaign_not_issuable'),
  });

  await tab(page, 'Mirror issuance').click();
  await page.getByLabel(/^Registry/u).fill('SRN-PPI');
  await page.getByLabel(/^Serial start/u).fill('SRN-2026-00001');
  await page.getByLabel(/^Serial end/u).fill('SRN-2026-12500');
  await page.getByLabel(/^Tonnes/u).fill('12.5');
  await trigger(page, 'Mirror issuance').click();
  await confirm(page, 'Mirror issuance').click();
  await expect(review(page, 'Mirror issuance').locator('[data-copy="COPY-018"]')).toBeVisible();
  await expect(page.getByLabel(/^Registry/u)).toHaveValue('SRN-PPI');
  await expect(page.getByLabel(/^Tonnes/u)).toHaveValue('12.5');
});

test('pattern 5 conflict S27 idempotency_key_reused: the sentence shows, and the next Confirm sends a new key', async ({
  open,
}) => {
  const { page, writes } = await openOperations(open, {
    write: (_call, before) =>
      before === 0
        ? failure(HTTP_CONFLICT, 'idempotency_key_reused')
        : {
            status: 202,
            body: { job: { id: '3b1e0c8a-6f2d-4a9b-8c7e-1d5f4a2b9e60', status: 'pending' } },
          },
  });

  await page.getByLabel(/^Planter wallet/u).fill(WALLET);
  await page.getByLabel(/^Slot count/u).fill('3');
  await trigger(page, 'Assign anchor slots').click();
  await confirm(page, 'Assign anchor slots').click();
  await expect(review(page, 'Assign anchor slots').locator('[data-copy="COPY-009"]')).toBeVisible();
  // Confirm is shut until something changes; the changed request gets a key of its own
  await expect(confirm(page, 'Assign anchor slots')).toBeDisabled();
  await page.getByLabel(/^Slot count/u).fill('2');
  await confirm(page, 'Assign anchor slots').click();
  await expect(page.locator('.ws-callout')).toBeVisible();
  expect(writes[1]?.headers['idempotency-key']).not.toBe(writes[0]?.headers['idempotency-key']);
});

test('pattern 5 conflict S27 price not_found: a batch that is gone is told, and Confirm is shut', async ({
  open,
}) => {
  const { page } = await openOperations(open, {
    address: '0x0000000000000000000000000000000000000006',
    campaign: () => ops({ campaign: { address: '0x0000000000000000000000000000000000000006' } }),
    batches: () => [
      {
        batchId: '101',
        registry: 'SRN PPI',
        vintage: 2025,
        usdcPerTonne: '18500000',
        inventoryAmount: '8400',
      },
    ],
    write: () => failure(404, 'not_found'),
  });

  await tab(page, 'Inventory price').click();
  await page.getByLabel(/^Requested USDC per tonne/u).fill('15');
  await trigger(page, 'Set inventory price').click();
  await confirm(page, 'Set inventory price').click();
  await expect(review(page, 'Set inventory price').getByRole('alert')).toContainText(
    'Batch not found',
  );
  await expect(confirm(page, 'Set inventory price')).toBeDisabled();
});

test('pattern 5 conflict S29 flag_not_open: the registry sentence shows and the re-read replaces the form', async ({
  open,
}) => {
  let current: object = FLAG_OPEN;
  const { page } = await openFlag(open, {
    flag: () => current,
    resolve: () => failure(HTTP_CONFLICT, 'flag_not_open'),
  });
  const note = page.getByLabel('Resolution note · 3–2,000 characters');

  await note.fill(NOTE);
  await page
    .locator('section.ws-panel')
    .getByRole('button', { name: 'Resolve flag', exact: true })
    .click();
  await review(page, 'Resolve flag').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByRole('alert').first().locator('[data-copy="COPY-016"]')).toBeVisible();
  current = flagWith({
    flag: { status: 'upheld', resolutionNote: 'Removed after a visit' },
    tree: { status: 'removed' },
  });
  await refocus(page);
  await expect(note).toHaveCount(0);
});

test('pattern 11 confirm S29 uphold: the review names the tree above the summary', async ({
  open,
}) => {
  const { page } = await openFlag(open);

  await page.getByLabel('Decision').selectOption('uphold');
  await page.getByLabel('Resolution note · 3–2,000 characters').fill(NOTE);
  await page
    .locator('section.ws-panel')
    .getByRole('button', { name: 'Resolve flag', exact: true })
    .click();

  const region = review(page, 'Resolve flag');

  await expect(region.locator('.ws-facts > div').filter({ hasText: 'Tree' }).first()).toContainText(
    '#3091',
  );
  await expect(region.locator('.ws-facts')).toBeVisible();
  await expect(region).toContainText('Tree becomes Removed after confirmation');
});
