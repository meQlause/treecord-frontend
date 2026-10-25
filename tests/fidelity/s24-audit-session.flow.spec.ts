// docs/FE/features/s24-audit-session.md §8: one test per criterion #1..#13, in the browser, under the docs/FE/fidelity.md §2
// conditions (S24 runs in UTC). Sign-in uses the real Privy test account (backend/.env); the session, the close and the report are
// answered by the spec with the audit.md examples (the backend does not run).
import type { Locator, Page } from '@playwright/test';
import { meBody } from './fixtures/accounts';
import { AUDITOR, CLOSED_ID, OPEN_ID } from './fixtures/audit';
import { CLOSE_BODY, SUMMARY } from './fixtures/audit-report';
import { CLOSED, COMPLETE, DETAIL } from './fixtures/audit-session';
import { failure } from './helpers/api';
import { openAudit, type Scene } from './helpers/audit-page';
import { expect, signInWith, test } from './helpers/flow';

const TEST_MS = 120_000;
const PATH = `/app/audit/${OPEN_ID}`;
const HTTP_CONFLICT = 409;

test.describe.configure({ timeout: TEST_MS });

const visit = (open: Parameters<typeof openAudit>[0], scene: Scene = {}) =>
  openAudit(open, { path: PATH, session: () => DETAIL, ...scene });

const cards = (page: Page) => page.locator('.campaign-card');

const fact = (page: Page, name: string): Locator =>
  page
    .locator('.ws-facts > div')
    .filter({ has: page.locator('dt', { hasText: new RegExp(`^${name}$`, 'u') }) })
    .locator('dd');

const summary = (page: Page) => page.getByLabel(/^Summary/u);

const close = (page: Page) => page.getByRole('button', { name: 'Close session', exact: true });

const review = (page: Page) => page.getByRole('region', { name: 'Review Close session' });

test('#1 the heading names the session, its campaign and its short id', async ({ open }) => {
  const { page } = await visit(open);

  await expect(
    page.getByText('AUDIT SESSION · OPEN · KALIMANTAN MANGROVE RESTORATION'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('3 trees,');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('drawn by a block.');
  await expect(page.getByText('SESSION / E9219997')).toBeVisible();
});

test('#2 the record lists the opening, the seed block, the hash and the population, and has no Report link', async ({
  open,
}) => {
  const { page } = await visit(open);

  await expect(fact(page, 'Opened')).toHaveText('21 Oct 2026, 03:30 UTC');
  await expect(fact(page, 'Seed block')).toHaveText('#17,000,015');
  await expect(fact(page, 'Block hash')).toHaveText('0x39e41cfd…35a4cd');
  await expect(fact(page, 'Population')).toHaveText('7 trees');
  await expect(fact(page, 'Report hash')).toHaveText('On close');
  await expect(page.getByRole('link', { name: 'Report', exact: true })).toHaveCount(0);
});

test('#3 the steps read opened, 1 of 3 findings, 2 challenges issued and not yet closed', async ({
  open,
}) => {
  const { page } = await visit(open);
  const steps = page.getByRole('region', { name: 'Session progress' });

  await expect(steps).toContainText('Opened');
  await expect(steps).toContainText('21 Oct 2026');
  await expect(steps).toContainText('Findings');
  await expect(steps).toContainText('1 of 3');
  await expect(steps).toContainText('2 issued');
  await expect(steps).toContainText('not yet');
});

test('#4 the three sample cards read their position, tree, finding and challenge', async ({
  open,
}) => {
  const { page } = await visit(open);

  for (const text of [
    'No finding yet',
    'Position 1',
    'East Kalimantan',
    'Tree #3001',
    'Challenge R4M9 · open',
    'Open the evidence to record a finding',
    'Open evidence',
  ]) {
    await expect(cards(page).nth(0)).toContainText(text);
  }

  for (const text of [
    'Follow-up',
    'Position 2',
    'Tree #3091',
    'Flagged · no challenge',
    'Flag remains open.',
    'Review again',
  ]) {
    await expect(cards(page).nth(1)).toContainText(text);
  }

  await expect(cards(page).nth(2)).toContainText('Challenge T2X8 · open');
});

test('#5 the rail reads 1/3 trees, 2 challenges, ready to close and 2 still to review', async ({
  open,
}) => {
  const { page } = await visit(open);
  const rail = page.locator('.cb-detail');

  await expect(rail).toContainText('1/3');
  await expect(rail).toContainText('Challenges');
  await expect(rail).toContainText('2 issued');
  await expect(rail).toContainText('Ready to close');
  await expect(rail).toContainText('2 still to review');
});

test('#6 the close section lists the trees still missing a finding and keeps "Close session" disabled', async ({
  open,
}) => {
  const { page } = await visit(open);

  await expect(page.getByText('Still missing a finding: #3001, #3104.')).toBeVisible();
  await expect(close(page)).toBeDisabled();
});

test('#7 closing sends the trimmed summary, opens the report from the answer, and clears the draft', async ({
  open,
}) => {
  const { page, closes, calls } = await visit(open, {
    session: () => COMPLETE,
    close: () => ({ status: 200, body: CLOSE_BODY }),
  });

  await summary(page).fill(`  ${SUMMARY}  `);
  await close(page).click();
  await review(page).getByRole('button', { name: 'Confirm' }).click();
  await page.waitForURL(`**/app/audit/${OPEN_ID}/report`);
  expect(closes[0]?.body).toEqual({ summary: SUMMARY });
  expect(calls.filter(({ path }) => path.endsWith('/report'))).toEqual([]);
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((key) => key.includes(':summary')),
    ),
  ).toEqual([]);
});

test('#8 a stale page that still shows every finding gets the missing list and a fresh read', async ({
  open,
}) => {
  let reads = 0;
  const { page } = await visit(open, {
    session: () => {
      reads += 1;

      return COMPLETE;
    },
    close: () => ({
      status: HTTP_CONFLICT,
      body: {
        error: {
          code: 'findings_incomplete',
          message: 'findings_incomplete',
          details: { missing: ['3001', '3104'] },
        },
      },
    }),
  });

  await close(page).click();
  await review(page).getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByRole('alert').first()).toContainText(
    'Still missing a finding: #3001, #3104.',
  );
  await expect.poll(() => reads).toBeGreaterThan(1);
});

test('#9 a close that was already done by a concurrent one counts as success', async ({ open }) => {
  const { page } = await visit(open, {
    session: () => COMPLETE,
    close: () => ({ status: 200, body: { ...CLOSE_BODY, idempotent: true } }),
  });

  await close(page).click();
  await review(page).getByRole('button', { name: 'Confirm' }).click();
  await page.waitForURL(`**/app/audit/${OPEN_ID}/report`);
  await expect(page).toHaveURL(/\/report$/u);
});

test('#10 while the close is pending Confirm and Cancel are disabled and the page has not changed', async ({
  open,
}) => {
  const gate = Promise.withResolvers<void>();
  const { page } = await visit(open, {
    session: () => COMPLETE,
    close: () => ({ status: 200, body: CLOSE_BODY }),
  });

  await page.route('**/api/v1/audit/sessions/*/close', async (route) => {
    await gate.promise;
    await route.fallback();
  });
  await close(page).click();
  await review(page).getByRole('button', { name: 'Confirm' }).click();
  await expect(review(page).locator('button[aria-busy="true"]')).toBeDisabled();
  await expect(review(page).getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await expect(page).toHaveURL(new RegExp(`${OPEN_ID}$`, 'u'));
  gate.resolve();
  await page.waitForURL(`**/app/audit/${OPEN_ID}/report`);
});

test('#11 a closed session has no close section, reads "Closed", shows its hash and links to the report', async ({
  open,
}) => {
  const { page } = await openAudit(open, {
    path: `/app/audit/${CLOSED_ID}`,
    session: () => CLOSED,
  });

  await expect(
    page.getByText('AUDIT SESSION · CLOSED · KALIMANTAN MANGROVE RESTORATION'),
  ).toBeVisible();
  await expect(page.getByText('Close the session')).toHaveCount(0);
  await expect(page.locator('.cb-detail')).toContainText('Closed');
  await expect(fact(page, 'Report hash')).toHaveText('0x97eb3c93…2c5341');
  await expect(page.getByRole('link', { name: 'Report', exact: true })).toHaveAttribute(
    'href',
    `/app/audit/${CLOSED_ID}/report`,
  );
});

test('#12 another auditor’s session answers 404: "Session not found" and the way back', async ({
  open,
}) => {
  const { page } = await visit(open, { session: () => failure(404, 'not_found') });

  await expect(page.getByText('Session not found')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to Audit' })).toBeVisible();
});

test('#13 the typed summary survives a reload and is gone after sign-out', async ({ open }) => {
  const { page } = await visit(open, { session: () => COMPLETE });

  await summary(page).fill('A draft for later');
  await page.reload();
  await signInWith(page, meBody(AUDITOR), { returnTo: PATH });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await expect(summary(page)).toHaveValue('A draft for later');
  await page.locator('summary[aria-label^="Account"]').click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys(sessionStorage).filter((key) => key.includes('treecord:draft:')),
      ),
    )
    .toEqual([]);
});
