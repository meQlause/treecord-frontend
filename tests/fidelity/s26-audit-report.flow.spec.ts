// docs/FE/features/s26-audit-report.md §7: one test per criterion #1..#10, in the browser, under the docs/FE/fidelity.md §2
// conditions (S26 runs in UTC). Sign-in uses the real Privy test account (backend/.env); the report is answered by the spec
// with the audit.md §7 body (the backend does not run).
import type { Page } from '@playwright/test';
import { CLOSED_ID, OPEN_ID } from './fixtures/audit';
import {
  CLOSE_BODY,
  NOTES,
  NOT_CLOSED,
  REPORT,
  REPORT_HASH,
  SUMMARY,
} from './fixtures/audit-report';
import { COMPLETE } from './fixtures/audit-session';
import { openAudit, type Scene } from './helpers/audit-page';
import { expect, test } from './helpers/flow';

const TEST_MS = 120_000;
const COPIED_MS = 1600;

test.describe.configure({ timeout: TEST_MS });

const visit = (open: Parameters<typeof openAudit>[0], scene: Scene = {}) =>
  openAudit(open, {
    path: `/app/audit/${CLOSED_ID}/report`,
    report: () => CLOSE_BODY,
    ...scene,
  });

const fact = (page: Page, name: string) =>
  page
    .locator('.ws-facts > div, dl > div')
    .filter({ has: page.locator('dt', { hasText: new RegExp(`^${name}$`, 'u') }) })
    .locator('dd');

test('#1 the heading names the report, the campaign, the short id and the summary', async ({
  open,
}) => {
  const { page } = await visit(open);

  await expect(
    page.getByText('CLOSED AUDIT REPORT · KALIMANTAN MANGROVE RESTORATION'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Audit report,');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('hashed and closed.');
  await expect(page.getByText('REPORT / 868C029F')).toBeVisible();
  await expect(page.getByText(SUMMARY)).toBeVisible();
});

test('#2 the ring counts 2 trees and the findings list joins each note on its position', async ({
  open,
}) => {
  const { page } = await visit(open);
  const findings = page
    .locator('section.cb-record')
    .filter({ has: page.getByRole('heading', { name: 'Findings' }) });

  await expect(findings).toContainText('2');
  await expect(findings).toContainText('TREES');
  await expect(findings).toContainText(
    /Tree #3091.*Follow-up.*Flag remains open\..*Tree #3001.*OK.*Planting and month-3 evidence consistent\./su,
  );
});

test('#3 no challenges says so', async ({ open }) => {
  const { page } = await visit(open);

  await expect(page.getByText('No challenges were issued in this session.')).toBeVisible();
});

test('#4 the seed inputs list the session, the block, the hash, the population, the sample and the close', async ({
  open,
}) => {
  const { page } = await visit(open);

  await expect(fact(page, 'Session')).toHaveText(CLOSED_ID);
  await expect(fact(page, 'Block')).toHaveText('#17,000,001');
  await expect(fact(page, 'Block hash')).toHaveText('0xd0e38899…d50701');
  await expect(fact(page, 'Population')).toHaveText('7 trees');
  await expect(fact(page, 'Sample')).toHaveText('3091, 3001');
  await expect(fact(page, 'Closed')).toContainText('21 Oct 2026, 06:00');
});

test('#5 the rail reads sealed, 2 of 7 trees, found OK and the totals line', async ({ open }) => {
  const { page } = await visit(open);
  const rail = page.locator('.cb-detail');

  await expect(rail).toContainText('Sealed');
  await expect(rail).toContainText('2 of 7');
  await expect(rail).toContainText('Found OK');
  await expect(rail).toContainText('1 ok · 0 issue · 1 follow-up');
});

test('#6 the panel shows the full hash; Copy hash puts it on the clipboard and reads "Copied" for 1.6 s', async ({
  open,
}) => {
  const { page } = await visit(open);

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await expect(page.getByText(REPORT_HASH)).toBeVisible();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByRole('button', { name: 'Copy hash' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(REPORT_HASH);
  await page.clock.runFor(COPIED_MS);
  await expect(page.getByRole('button', { name: 'Copy hash' })).toBeVisible();
});

test('#7 an empty summary, or no notes at all, reads "No summary."', async ({ open }) => {
  const empty = await visit(open, {
    report: () => ({ ...CLOSE_BODY, notes: { ...NOTES, summary: '' } }),
  });

  await expect(empty.page.getByText('No summary.')).toBeVisible();

  const none = await visit(open, { report: () => ({ ...CLOSE_BODY, notes: null }) });

  await expect(none.page.getByText('No summary.')).toBeVisible();
  await expect(none.page.getByText('Flag remains open.')).toHaveCount(0);
});

test('#8 an open session’s report says it is not closed and links back to the session', async ({
  open,
}) => {
  const { page } = await visit(open, {
    path: `/app/audit/${OPEN_ID}/report`,
    report: () => NOT_CLOSED,
  });

  await expect(page.getByText('Report not closed')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Complete findings and close session' }),
  ).toHaveAttribute('href', `/app/audit/${OPEN_ID}`);
});

test('#9 the report that D13 returned is shown without another request', async ({ open }) => {
  const { page, calls } = await openAudit(open, {
    path: `/app/audit/${OPEN_ID}`,
    session: () => COMPLETE,
    close: () => ({ status: 200, body: CLOSE_BODY }),
  });

  await page.getByRole('button', { name: 'Close session', exact: true }).click();
  await page
    .getByRole('region', { name: 'Review Close session' })
    .getByRole('button', { name: 'Confirm' })
    .click();
  await page.waitForURL(`**/app/audit/${OPEN_ID}/report`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Audit report,');
  expect(calls.filter(({ path }) => path.endsWith('/report'))).toEqual([]);
});

test('#10 a challenge row names the tree, the code and when it expires', async ({ open }) => {
  const { page } = await visit(open, {
    report: () => ({
      ...CLOSE_BODY,
      report: {
        ...REPORT,
        challenges: [
          {
            treeId: '3001',
            code: 'R4M9',
            expiresAt: '2026-12-20T04:00:00.000Z',
            fulfilledSubmissionId: null,
          },
        ],
      },
    }),
  });

  await expect(page.getByText('Tree #3001 · R4M9')).toBeVisible();
  await expect(page.getByText('expires 20 Dec 2026')).toBeVisible();
});
