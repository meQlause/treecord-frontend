// docs/FE/features/s08-batch.md §8, the criteria that do not need a wallet: #1..#7, in the browser, under the
// docs/FE/fidelity.md §2 conditions. The backend does not run: `GET /carbon/batches/:id` is answered with the carbon.md §2
// example by page.route (helpers/api.ts). The page is public, so nobody signs in.
// F2b: #8..#20 are D08, the purchase itself (amount, quote, allowance, approve, buy, indexing), listed at the top of
// s08-batch.md; they need the signed-in wallet harness and the anvil chain.
import type { Page } from '@playwright/test';
import { BATCH_101, BATCH_103, BATCH_104 } from './fixtures/carbon';
import { answerApi, failure, type ApiAnswer, type ApiCall } from './helpers/api';
import { expect, test, type OpenOptions } from './helpers/flow';
import type { Json } from './fixtures/campaigns';
import { VIEWPORTS } from './matrix';

const ROW = 'S08';
const WIDE = VIEWPORTS[1];
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_UNAVAILABLE = 503;

type Responder = (call: ApiCall) => ApiAnswer | Promise<ApiAnswer>;

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

/** Opens `path` with `answer` replying to the one carbon read. */
const visit = async (open: Open, answer: Responder, path = '/carbon/101'): Promise<Page> => {
  const { page } = await open({ row: ROW, viewport: WIDE });

  await answerApi(page, answer);
  await page.goto(path);

  return page;
};

const body =
  (json: Json): Responder =>
  () => ({ body: json });

const record = (page: Page, label: string) =>
  page.locator('.cb-cert dl > div').filter({ has: page.getByText(label, { exact: true }) });

const RECORD_FACTS: [string, string][] = [
  ['Vintage', '2025'],
  ['Species', 'Rhizophora mangrove'],
  ['Campaign', 'Back to the mangroves'],
  ['Issued on', '12 Sept 2026, 08:00 UTC'],
];

test('#1 /carbon/101 reads its heading, coordinate, meta line, issue time and serial range', async ({
  open,
}) => {
  const page = await visit(open, body(BATCH_101));

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Batch #101');
  await expect(page.locator('.hero-coordinate')).toHaveText('BATCH #101 / SRN PPI');
  await expect(page.locator('.cb-prov-meta')).toHaveText(
    'SRN PPI · Vintage 2025 · Rhizophora mangrove',
  );

  for (const [label, value] of RECORD_FACTS) {
    await expect(record(page, label).locator('dd')).toHaveText(value);
  }

  await expect(page.locator('.cb-range-ends')).toHaveText(
    /SRN-2025-00001\s*16\.000 tCO₂e\s*SRN-2025-16000/,
  );
});

test('#2 the stock card, the journey and the buy panel read 8.400 available of 16.000 issued at 18.5', async ({
  open,
}) => {
  const page = await visit(open, body(BATCH_101));
  const stock = page.locator('.cb-stock-card');
  const buy = page.locator('.cb-buy');

  await expect(stock.locator('.cw-balance')).toHaveText(/8\.400/);
  await expect(stock).toContainText('Available inventory');
  await expect(stock.locator('.cw-allocation')).toContainText('Total issued');
  await expect(stock.locator('.cw-allocation')).toContainText('16.000');
  await expect(stock.locator('.cw-reservation')).toContainText('Still available');
  await expect(stock.locator('.cw-reservation strong')).toHaveText('53%');
  await expect(page.locator('.cb-journey-art')).toHaveAttribute(
    'aria-label',
    /Available: 8\.400 tCO₂e/,
  );
  await expect(buy.locator('.cb-buy-price strong')).toHaveText('18.5');
  await expect(buy.locator('.cb-buy-price')).toContainText('USDC / tonne');
  await expect(buy.locator('.cb-inventory')).toHaveText('8.400 tCO₂e available');
});

test('#3 the issuance transaction links to the explorer, or reads "Not available yet" without one', async ({
  open,
}) => {
  const page = await visit(open, body(BATCH_101));
  const link = record(page, 'Issuance transaction').getByRole('link', { name: '0x1b8e…8d1b' });

  await expect(link).toHaveAttribute('href', /^https:\/\/sepolia\.basescan\.org\/tx\/0x1b8e/);
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');

  const bare = await visit(open, body({ ...BATCH_101, issuedTx: null }));

  await expect(record(bare, 'Issuance transaction').locator('dd')).toHaveText('Not available yet');
});

test('#4 batch 104 reads 3.000 of 8.000 at 38%, the amount and Max are off and the button reads "Sales paused"', async ({
  open,
}) => {
  const page = await visit(open, body(BATCH_104), '/carbon/104');
  const stock = page.locator('.cb-stock-card');

  await expect(stock.locator('.cw-balance')).toHaveText(/3\.000/);
  await expect(stock.locator('.cw-allocation')).toContainText('8.000');
  await expect(stock.locator('.cw-reservation strong')).toHaveText('38%');
  await expect(page.getByLabel('Amount · tCO₂e')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Max' })).toBeDisabled();
  await expect(
    page.locator('.cb-buy').getByRole('button', { name: 'Sales paused' }),
  ).toBeDisabled();
});

test('#5 batch 103 reads "Sold out" on a disabled button', async ({ open }) => {
  const page = await visit(open, body(BATCH_103), '/carbon/103');

  await expect(page.locator('.cb-buy').getByRole('button', { name: 'Sold out' })).toBeDisabled();
});

test('#6 an unknown or invalid batch says "Batch not found" and offers "Browse batches"', async ({
  open,
}) => {
  const cases: [string, number, string][] = [
    ['999', HTTP_NOT_FOUND, 'not_found'],
    ['abc', HTTP_BAD_REQUEST, 'invalid_path'],
  ];

  for (const [id, status, code] of cases) {
    const page = await visit(open, () => failure(status, code), `/carbon/${id}`);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Batch #${id}`);
    await expect(page.locator('.empty-state')).toContainText('Batch not found');
    await expect(page.getByRole('link', { name: 'Browse batches' })).toHaveAttribute(
      'href',
      '/carbon',
    );
  }
});

test('#7 a 503 shows "Couldn’t load carbon credits" and "Try again", which asks again', async ({
  open,
}) => {
  let calls = 0;
  const page = await visit(open, () => {
    calls += 1;

    return failure(HTTP_UNAVAILABLE, 'service_unavailable');
  });
  const alert = page.getByRole('alert');

  await expect(alert).toContainText('Couldn’t load carbon credits');
  await alert.getByRole('button', { name: 'Try again' }).click();
  await expect.poll(() => calls).toBe(2);
});
