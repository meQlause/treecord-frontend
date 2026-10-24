// docs/FE/features/s09-certificate.md §8: one test per criterion #1..#14, in the browser, under the docs/FE/fidelity.md
// §2 conditions. The backend does not run: `GET /carbon/retirements/:id` is answered with the carbon.md §5 example by
// page.route (helpers/api.ts). The page is public, so nobody signs in.
import type { Page } from '@playwright/test';
import { CAMPAIGN_ADDRESS, retirement, withBatch } from './fixtures/retirement';
import { answerApi, failure, type ApiAnswer, type ApiCall } from './helpers/api';
import { expect, test, type OpenOptions } from './helpers/flow';
import { VIEWPORTS } from './matrix';

const ROW = 'S09';
const WIDE = VIEWPORTS[1];
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_UNAVAILABLE = 503;
const COPIED_MS = 1800;

type Responder = (call: ApiCall) => ApiAnswer | Promise<ApiAnswer>;

type Opened = { page: Page; calls: ApiCall[] };

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

/** Opens `path` with `answer` replying to the one carbon read; `calls` is every request to the API so far. */
const visit = async (
  open: Open,
  answer: Responder,
  path = '/carbon/retirements/1',
): Promise<Opened> => {
  const { page } = await open({ row: ROW, viewport: WIDE });
  const calls = await answerApi(page, answer);

  await page.goto(path);

  return { page, calls };
};

const body =
  (json: unknown): Responder =>
  () => ({ body: json });

const record = (page: Page, label: string) =>
  page.locator('.cb-cert dl > div').filter({ has: page.getByText(label, { exact: true }) });

const panel = (page: Page) => page.locator('.rc-panel');

test('#1 a signed-out visitor sees the certificate, and the request carries no Authorization header', async ({
  open,
}) => {
  const { page, calls } = await visit(open, body(retirement()));
  const cert = page.locator('.rc-cert');

  await expect(cert).toContainText('No. 1');
  await expect(cert.locator('.rc-amount')).toHaveText(/0\.500\s*tCO₂e/);
  await expect(cert).toContainText(
    'of carbon removal from Back to the mangroves, issued as batch #101 under SRN PPI, was permanently retired on behalf of',
  );
  await expect(cert.locator('.rc-name')).toHaveText('PT Hijau Lestari');
  await expect(cert.locator('.rc-purpose')).toHaveText('“2026 scope 3 offset”');
  expect(calls[0]?.path).toBe('/carbon/retirements/1');
  expect(calls[0]?.headers.authorization).toBeUndefined();
});

test('#2 the foot reads the date, the ledger and the registry, and the coordinate reads "RECORD / 1"', async ({
  open,
}) => {
  const { page } = await visit(open, body(retirement()));
  const foot = page.locator('.rc-foot');

  await expect(foot).toContainText('Retired on');
  await expect(foot).toContainText('20 September 2026');
  await expect(foot).toContainText('Ledger');
  await expect(foot).toContainText('Base Sepolia');
  await expect(foot).toContainText('Registry');
  await expect(foot).toContainText('Pending');
  await expect(page.locator('.hero-coordinate')).toHaveText('RECORD / 1');
});

test('#3 a pending registry shows "Pending · updates when SRN PPI confirms" and the current step', async ({
  open,
}) => {
  const { page } = await visit(open, body(retirement()));

  await expect(panel(page)).toContainText('On-chain retirement');
  await expect(panel(page)).toContainText('Confirmed · 20 September 2026');
  await expect(panel(page)).toContainText('Pending · updates when SRN PPI confirms');
  await expect(page.locator('.rc-steps li.now')).toContainText('Registry retirement');
  await expect(record(page, 'Registry reference').locator('dd')).toHaveText('Not available yet');
});

test('#4 a done registry shows its reference in the record, the foot and the panel', async ({
  open,
}) => {
  const done = { status: 'done', reference: 'SRN-RET-2026-000042' };
  const { page } = await visit(open, body(retirement({ registryRetirement: done })));

  await expect(record(page, 'Registry reference').locator('dd')).toHaveText('SRN-RET-2026-000042');
  await expect(page.locator('.rc-foot')).toContainText('Done');
  await expect(panel(page)).toContainText('Done · SRN-RET-2026-000042');
  await expect(page.locator('.rc-steps li.done')).toHaveCount(4);
});

const FACTS: [string, string][] = [
  ['Retired at', '20 Sept 2026, 08:00 UTC'],
  ['Holder', '0x1a2b…9f0e'],
  ['Batch', '#101 · SRN PPI · Vintage 2025'],
  ['Public geohash', 'qqguwvt'],
  ['Retirement transaction', '0x2d5f…2f5d'],
];

test('#5 the journey and the on-chain record read the batch, the holder, the hashes and the serial range', async ({
  open,
}) => {
  const { page } = await visit(open, body(retirement()));

  for (const text of ['SRN PPI · Vintage 2025', '0x1a2b…9f0e', '20 Sept 2026']) {
    await expect(page.locator('.rc-steps')).toContainText(text);
  }

  for (const [label, value] of FACTS) {
    await expect(record(page, label).locator('dd')).toHaveText(value);
  }

  const issuance = record(page, 'Issuance transaction').getByRole('link', { name: '0x1b8e…8d1b' });

  await expect(issuance).toHaveAttribute('href', /^https:\/\/sepolia\.basescan\.org\/tx\/0x1b8e/);
  await expect(issuance).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator('.cb-range-ends')).toHaveText(
    /SRN-2025-00001\s*16\.000 tCO₂e\s*SRN-2025-16000/,
  );
});

test('#6 a batch without an issuance transaction reads "Not available yet"', async ({ open }) => {
  const { page } = await visit(open, body(withBatch({ issuedTx: null })));

  await expect(record(page, 'Issuance transaction').locator('dd')).toHaveText('Not available yet');
});

test('#7 the stock card and "Where it grew" read the amount, the batch share and the campaign', async ({
  open,
}) => {
  const { page } = await visit(open, body(retirement()));
  const stock = page.locator('.cb-stock-card');
  const where = page.locator('.rc-where');

  await expect(stock).toContainText('Retired');
  await expect(stock).toContainText('For PT Hijau Lestari');
  await expect(stock.locator('.cw-balance')).toHaveText(/0\.500/);
  await expect(stock.locator('.cw-allocation')).toContainText('Batch issued');
  await expect(stock.locator('.cw-allocation')).toContainText('16.000');
  await expect(stock).toContainText('Share of batch #101');
  await expect(stock.locator('.cw-reservation strong')).toHaveText('3.1%');
  await expect(stock).toContainText('Claimed for good');
  await expect(where).toContainText('Back to the mangroves');
  await expect(where).toContainText('Cilacap, Central Java');
  await expect(where).toContainText('Rhizophora mangrove · 900 trees');
});

test('#8 a retirement without a purpose reads "No purpose given" without quotes', async ({
  open,
}) => {
  const { page } = await visit(open, body(retirement({ purpose: null })));

  await expect(page.locator('.rc-purpose')).toHaveText('No purpose given');
});

test('#9 "Copy record link" puts the page URL on the clipboard and reads "Link copied" for about 2 s', async ({
  open,
}) => {
  const { page } = await visit(open, body(retirement()));

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await panel(page).getByRole('button', { name: 'Copy record link' }).click();

  const copied = panel(page).getByRole('button', { name: 'Link copied' });

  await expect(copied).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
  await expect(panel(page).getByRole('button', { name: 'Copy record link' })).toBeVisible({
    timeout: COPIED_MS * 2,
  });
});

test('#10 "Print certificate" calls window.print once and makes no PDF request', async ({
  open,
}) => {
  const { page, calls } = await visit(open, body(retirement()));

  await page.evaluate(() => {
    (window as unknown as { prints: number }).prints = 0;
    window.print = () => {
      (window as unknown as { prints: number }).prints += 1;
    };
  });
  await panel(page).getByRole('button', { name: 'Print certificate' }).click();

  expect(await page.evaluate(() => (window as unknown as { prints: number }).prints)).toBe(1);
  expect(calls).toHaveLength(1);
});

test('#11 "Batch #101" opens /carbon/101 and "Campaign" opens the campaign', async ({ open }) => {
  const { page } = await visit(open, body(retirement()));

  await panel(page).getByRole('link', { name: 'Campaign' }).click();
  await expect(page).toHaveURL(new RegExp(`/campaigns/${CAMPAIGN_ADDRESS}$`));
  await page.goBack();
  await panel(page).getByRole('link', { name: 'Batch #101' }).click();
  await expect(page).toHaveURL(/\/carbon\/101$/);
});

test('#12 an invalid or unknown id says "Retirement record not found" with a way back', async ({
  open,
}) => {
  const cases: [string, number, string][] = [
    ['abc', HTTP_BAD_REQUEST, 'invalid_path'],
    ['999', HTTP_NOT_FOUND, 'not_found'],
  ];

  for (const [id, status, code] of cases) {
    const { page } = await visit(open, () => failure(status, code), `/carbon/retirements/${id}`);

    await expect(page.locator('.empty-state')).toContainText('Retirement record not found');
    await expect(page.getByRole('link', { name: 'Back to My carbon' })).toHaveAttribute(
      'href',
      '/app/carbon',
    );
  }
});

test('#13 while pending the page is busy with no amount; a 503 shows the alert and "Try again"', async ({
  open,
}) => {
  let release = (): void => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const { page } = await visit(open, async () => {
    await gate;

    return { body: retirement() };
  });

  await expect(page.locator('[aria-busy="true"]')).toBeVisible();
  await expect(page.locator('main')).not.toContainText('tCO₂e');
  release();
  const failed = await visit(open, () => failure(HTTP_UNAVAILABLE, 'service_unavailable'));
  const alert = failed.page.getByRole('alert');

  await expect(alert).toContainText('Could not load this page');
  await expect(alert).toContainText('Your inputs and local records are unchanged.');
  await expect(alert.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('#14 the page has no control to edit, delete or change the registry status', async ({
  open,
}) => {
  const { page } = await visit(open, body(retirement()));
  const buttons = page.locator('main').getByRole('button');

  await expect(buttons).toHaveText([/Copy record link/, /Print certificate/]);
  await expect(page.locator('main input, main textarea, main select')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /edit|delete|registry|retire/i })).toHaveCount(0);
});
