// docs/FE/features/s12-job.md §7: one test per criterion JB-AC1..JB-AC19, asserting its Then column under the fidelity.md
// §2 conditions (Asia/Jakarta for this row). Sign-in uses the real Privy test account (backend/.env); `GET /me` follows
// the profile the spec holds and `GET /jobs/:id` is answered with the jobs.md §2 bodies (the backend does not run).
// F4a: JB-AC17 starts from "Track job" on S04's claim form (D06), which is built there; every other criterion runs now.
import type { Page } from '@playwright/test';
import { SARI, meBody, type MeProfile } from './fixtures/accounts';
import {
  CAMPAIGN,
  CLAIM_ID,
  FLAG_ID,
  claim,
  failedFlag,
  failedFlagForCreator,
} from './fixtures/job';
import { expect, settle, signInWith, test, type OpenOptions } from './helpers/flow';
import { answerJobs, type JobResponder } from './helpers/jobs';
import { meFollows, type MeState } from './helpers/profile';
import { VIEWPORTS } from './matrix';

const ROW = 'S12';
const WIDE = VIEWPORTS[1];
const RAKA: MeProfile = { ...SARI, role: 'operator', displayName: 'Raka' };
const ALEX: MeProfile = { ...SARI, role: 'donor', displayName: 'Alex' };
const HTTP_NOT_FOUND = 404;
const HTTP_UNAVAILABLE = 503;
const POLL_WINDOW_MS = 6000;
const HIDDEN_MS = 10_000;
const TEST_MS = 120_000;

test.describe.configure({ timeout: TEST_MS });

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

type Opened = { page: Page; asked: string[] };

/** Signs in as `profile` and opens `/app/jobs/{id}`, `answer` replying to every read of the job. */
const openJob = async (
  open: Open,
  profile: MeProfile,
  answer: JobResponder,
  id = CLAIM_ID,
): Promise<Opened> => {
  const { page } = await open({ row: ROW, viewport: WIDE });
  const account: MeState = { current: profile };
  const asked: string[] = [];

  await signInWith(page, meBody(profile), {
    returnTo: `/app/jobs/${id}`,
    setup: async (target) => {
      await meFollows(target, account);
      await answerJobs(target, answer, asked);
    },
  });
  await page.getByRole('button', { name: /^Continue to/ }).click();
  await page.waitForURL(`**/app/jobs/${id}`);

  return { page, asked };
};

const showing =
  (body: unknown): JobResponder =>
  () => ({ body });

const record = (page: Page, label: string) =>
  page.locator('.cb-cert dl > div').filter({ has: page.getByText(label, { exact: true }) });

const stock = (page: Page) => page.locator('.cb-stock-card');

const meaning = (page: Page) => page.locator('.pl-panel');

const steps = (page: Page) => page.locator('.rc-steps li');

const CLAIM_TX = '0x9c4e2a7f1b8d3c6e0f5a9b2d7c4e1f8a3b6d9c2e5f0a7b4d1c8e3f6a9b2d5ce1';

test('JB-AC1 Sari reads her confirmed claim: heading, lifecycle, record and what it means', async ({
  open,
}) => {
  const { page } = await openJob(open, SARI, showing(claim()));

  await expect(page.locator('.page-heading .eyebrow')).toHaveText('TRANSACTION · CLAIM SLOTS');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Sent to\s*the chain\./);
  await expect(page.locator('.hero-coordinate')).toHaveText('JOB / 3F2A…');
  await expect(page.locator('.rc-steps li.done')).toHaveCount(4);
  await expect(stock(page).locator('.cw-balance strong')).toHaveText('Confirmed');
  await expect(stock(page).locator('.cw-reservation small')).toHaveText('Step 4 of 4');
  await expect(record(page, 'Kind').locator('dd')).toHaveText('Claim slots');
  await expect(record(page, 'Job id').locator('dd')).toHaveText(CLAIM_ID);
  await expect(record(page, 'Attempts').locator('dd')).toHaveText('1');
  await expect(record(page, 'Created / updated').locator('dd')).toHaveText(
    '23 Oct 2026, 10:02 GMT+7 / 23 Oct 2026, 10:03 GMT+7',
  );
  await expect(record(page, 'Transaction hash').locator('dd')).toHaveText(CLAIM_TX);
  await expect(record(page, 'Last error')).toHaveCount(0);
  await expect(meaning(page).locator('.eyebrow')).toHaveText('CONFIRMED');
  await expect(meaning(page)).toContainText('Confirmed. The result is in your workspace now.');
});

test('JB-AC2 "View slots" opens /app/planter/slots', async ({ open }) => {
  const { page } = await openJob(open, SARI, showing(claim()));

  await meaning(page).getByRole('link', { name: 'View slots' }).click();

  await expect(page).toHaveURL(/\/app\/planter\/slots$/);
});

test('JB-AC3 a sent job has Sent current, "Step 3 of 4" and its hash', async ({ open }) => {
  const { page } = await openJob(open, SARI, showing(claim({ status: 'sent' })));

  await expect(steps(page).nth(0)).toHaveClass(/done/);
  await expect(steps(page).nth(1)).toHaveClass(/done/);
  await expect(steps(page).nth(2)).toHaveClass(/now/);
  await expect(stock(page).locator('.cw-reservation small')).toHaveText('Step 3 of 4');
  await expect(meaning(page)).toContainText('Broadcast. The receipt is not final yet.');
  await expect(record(page, 'Transaction hash').locator('dd')).toHaveText(CLAIM_TX);
});

test('JB-AC4 a pending job is followed to "Confirmed" without a reload, and polling stops there', async ({
  open,
}) => {
  const { page, asked } = await openJob(open, SARI, ({ n }) => ({
    body: n < 3 ? claim({ status: 'pending', txHash: null }) : claim(),
  }));

  await expect(stock(page).locator('.cw-balance strong')).toHaveText('Confirmed');
  const seen = asked.length;

  await settle(page, POLL_WINDOW_MS);

  expect(asked).toHaveLength(seen);
  await expect(page.locator('.toast')).toHaveCount(0);
});

test('JB-AC5 a hidden tab makes no request', async ({ open }) => {
  const { page, asked } = await openJob(
    open,
    SARI,
    showing(claim({ status: 'pending', txHash: null })),
  );

  await expect(stock(page).locator('.cw-balance strong')).toHaveText('Pending');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const seen = asked.length;

  await settle(page, HIDDEN_MS);

  expect(asked).toHaveLength(seen);
});

test('JB-AC6 an operator reads a failed job: "Sent to try again.", the attempts, the last error and no Retry', async ({
  open,
}) => {
  const { page } = await openJob(open, RAKA, showing(failedFlag()), FLAG_ID);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Sent to\s*try again\./);
  await expect(stock(page).locator('.cw-balance strong')).toHaveText('Failed');
  await expect(stock(page).locator('.cw-reservation small')).toHaveText('Failed · retry below');
  await expect(record(page, 'Attempts').locator('dd')).toHaveText('5');
  await expect(record(page, 'Created / updated').locator('dd')).toHaveText(
    '22 Oct 2026, 16:14 GMT+7 / 22 Oct 2026, 16:41 GMT+7',
  );
  await expect(record(page, 'Transaction hash').locator('dd')).toHaveText('Pending');
  await expect(record(page, 'Last error').locator('dd')).toHaveText('Worker failure');
  await expect(meaning(page).locator('.eyebrow')).toHaveText('FAILED');
  await expect(meaning(page)).toContainText(
    'The job failed. Check the originating action, then retry.',
  );
  await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0);
});

test('JB-AC7 "View tree" opens /trees/3091', async ({ open }) => {
  const { page } = await openJob(open, RAKA, showing(failedFlag()), FLAG_ID);

  await meaning(page).getByRole('link', { name: 'View tree' }).click();

  await expect(page).toHaveURL(/\/trees\/3091$/);
});

test('JB-AC8 "Back to operations" opens the campaign operations page', async ({ open }) => {
  const { page } = await openJob(open, RAKA, showing(failedFlag()), FLAG_ID);

  await meaning(page).getByRole('link', { name: 'Back to operations' }).click();

  await expect(page).toHaveURL(new RegExp(`/app/operator/campaigns/${CAMPAIGN}$`));
});

test('JB-AC9 a creator reads a failed job without the "Last error" row', async ({ open }) => {
  const { page } = await openJob(open, SARI, showing(failedFlagForCreator()), FLAG_ID);

  await expect(record(page, 'Attempts').locator('dd')).toHaveText('5');
  await expect(record(page, 'Last error')).toHaveCount(0);
});

test('JB-AC10 an operator reads "None" when the last error is null', async ({ open }) => {
  const { page } = await openJob(open, RAKA, showing(claim({ lastError: null })));

  await expect(record(page, 'Last error').locator('dd')).toHaveText('None');
});

test('JB-AC11 a job that is not the signed-in person’s reads "Job not found" and no record', async ({
  open,
}) => {
  const { page } = await openJob(open, SARI, () => ({
    status: HTTP_NOT_FOUND,
    body: { error: { code: 'not_found', message: 'not_found' } },
  }));

  await expect(page.locator('main')).toContainText('Job not found');
  await expect(page.getByText('Job record')).toHaveCount(0);
});

test('JB-AC12 an id that is not a uuid reads "Job not found" and makes no request', async ({
  open,
}) => {
  const { page, asked } = await openJob(open, SARI, showing(claim()), 'demo-claim');

  await expect(page.locator('main')).toContainText('Job not found');
  expect(asked).toEqual([]);
});

test('JB-AC13 a score job reads "—" for its hash and says scoring is not a verdict', async ({
  open,
}) => {
  const { page } = await openJob(
    open,
    SARI,
    showing(claim({ kind: 'score', txHash: null, context: { campaign: null } })),
  );

  await expect(page.locator('.page-heading .eyebrow')).toHaveText('TRANSACTION · SCORE EVIDENCE');
  await expect(meaning(page)).toContainText(
    'Scoring finished; this does not mean evidence passed.',
  );
  await expect(page.getByTestId('job-tx')).toHaveText('—');
});

test('JB-AC14 a kind without a label shows its identifier', async ({ open }) => {
  const { page } = await openJob(open, SARI, showing(claim({ kind: 'anchor_assign' })));

  await expect(page.locator('.page-heading .eyebrow')).toHaveText('TRANSACTION · ANCHOR_ASSIGN');
  await expect(record(page, 'Kind').locator('dd')).toHaveText('anchor_assign');
});

test('JB-AC15 a donor who made the claim as a planter still reads the job', async ({ open }) => {
  const { page } = await openJob(open, ALEX, showing(claim()));

  await expect(record(page, 'Job id').locator('dd')).toHaveText(CLAIM_ID);
  await expect(page.getByText('Role unavailable')).toHaveCount(0);
});

test('JB-AC16 a failed first read says "Could not load this page", and "Try again" asks once more', async ({
  open,
}) => {
  const { page, asked } = await openJob(open, SARI, ({ n }) =>
    n === 1
      ? { status: HTTP_UNAVAILABLE, body: { error: { code: 'service_unavailable', message: 'x' } } }
      : { body: claim() },
  );
  const alert = page.getByRole('alert');

  await expect(alert).toContainText('Could not load this page');
  await alert.getByRole('button', { name: 'Try again' }).click();

  await expect(record(page, 'Job id').locator('dd')).toHaveText(CLAIM_ID);
  expect(asked).toHaveLength(2);
});

test('JB-AC18 an operator sees "Back to operations" and not "View slots"', async ({ open }) => {
  const { page } = await openJob(open, RAKA, showing(claim()));

  await expect(meaning(page).getByRole('link', { name: 'Back to operations' })).toBeVisible();
  await expect(meaning(page).getByRole('link', { name: 'View slots' })).toHaveCount(0);
});

test('JB-AC19 a planter sees "View slots" and not "Back to operations"', async ({ open }) => {
  const { page } = await openJob(open, SARI, showing(claim()));

  await expect(meaning(page).getByRole('link', { name: 'View slots' })).toBeVisible();
  await expect(meaning(page).getByRole('link', { name: 'Back to operations' })).toHaveCount(0);
});
