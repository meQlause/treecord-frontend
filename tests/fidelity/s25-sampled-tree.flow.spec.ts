// docs/FE/features/s25-sampled-tree.md §7: one test per criterion #1..#15, in the browser, under the docs/FE/fidelity.md §2
// conditions (S25 runs in UTC). Sign-in uses the real Privy test account (backend/.env); the session, the tree's bundle, the
// finding and the challenge are answered by the spec with the audit.md examples (the backend does not run).
import type { Page } from '@playwright/test';
import { meBody } from './fixtures/accounts';
import { AUDITOR, CLOSED_ID, OPEN_ID } from './fixtures/audit';
import { CLOSED as CLOSED_SESSION, DETAIL } from './fixtures/audit-session';
import { BUNDLE, CLOSED, EXPIRED, FLAGGED, SUBMISSION_ID, verifying } from './fixtures/audit-tree';
import { failure } from './helpers/api';
import { openAudit, type Scene } from './helpers/audit-page';
import { expect, goInApp, signInWith, test } from './helpers/flow';

const TEST_MS = 120_000;
const HTTP_CONFLICT = 409;
const PATH = `/app/audit/${OPEN_ID}/trees/3001`;

test.describe.configure({ timeout: TEST_MS });

const visit = (open: Parameters<typeof openAudit>[0], scene: Scene = {}, path = PATH) =>
  openAudit(open, { path, session: () => DETAIL, bundle: () => BUNDLE, ...scene });

const rail = (page: Page) => page.locator('.cb-detail');

const notes = (page: Page) => page.getByLabel(/^Notes/u);

const save = (page: Page) => page.getByRole('button', { name: 'Save finding', exact: true });

const issue = (page: Page) => page.getByRole('button', { name: 'Issue challenge', exact: true });

const bundleReads = (calls: { path: string }[]) =>
  calls.filter(({ path }) => path.includes('/trees/')).length;

const keys = (page: Page) =>
  page.evaluate(() => Object.keys(sessionStorage).filter((key) => key.includes(':notes:')));

test('#1 the heading names the position, the tree and the session, and the bundle is read once', async ({
  open,
}) => {
  const { page, calls } = await visit(open);

  await expect(page.getByText('SAMPLED TREE · POSITION 1 OF 3')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tree #3001,');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('under review.');
  await expect(page.getByText('SESSION / E9219997')).toBeVisible();
  expect(bundleReads(calls)).toBe(1);
});

test('#2 the evidence row shows the score, the kind, the id with its policy and the status, and links to S21', async ({
  open,
}) => {
  const { page } = await visit(open);
  const row = page.locator(`a[href="/app/evidence/${SUBMISSION_ID}"]`).first();

  await expect(row).toContainText('96');
  await expect(row).toContainText('PLANTED · month 0');
  await expect(row).toContainText(`${SUBMISSION_ID} · policy 9,580`);
  await expect(row).toContainText('onchain');
});

test('#3 the rail reads the tree, its status, the milestones, the growth and that no finding exists yet', async ({
  open,
}) => {
  const { page } = await visit(open);

  for (const text of [
    'Tree #3001',
    'Alive',
    'Milestones paid',
    '2/6',
    'Growth to month 36',
    'month 6',
    'No finding recorded yet.',
  ]) {
    await expect(rail(page)).toContainText(text);
  }
});

test('#4 an open challenge shows its code, dates and status, and there is no "Issue challenge"', async ({
  open,
}) => {
  const { page } = await visit(open);

  for (const text of [
    'OPEN CHALLENGE',
    'R4M9',
    '21 Oct 2026',
    '20 Dec 2026',
    'Open',
    'The next recording must show R4M9.',
  ]) {
    await expect(rail(page)).toContainText(text);
  }

  await expect(issue(page)).toHaveCount(0);
});

test('#5 Save finding sends the finding, changes nothing until the 200, then toasts and updates the rail', async ({
  open,
}) => {
  const gate = Promise.withResolvers<void>();
  const { page, findings } = await visit(open, {
    finding: () => ({
      status: 200,
      body: {
        position: 0,
        treeId: '3001',
        finding: 'issue',
        notes: 'Flag remains open.',
        recordedAt: '2026-10-21T04:12:00.000Z',
      },
    }),
  });

  await page.route('**/api/v1/audit/sessions/*/findings', async (route) => {
    await gate.promise;
    await route.fallback();
  });
  await page.getByRole('radio', { name: 'Issue' }).click();
  await notes(page).fill('Flag remains open.');
  await save(page).click();
  await expect(page.getByText('Finding saved')).toHaveCount(0);
  await expect(rail(page)).toContainText('No finding recorded yet.');
  gate.resolve();
  await expect(page.getByText('Finding saved')).toBeVisible();
  await expect(rail(page)).toContainText('Your finding: Issue');
  expect(findings[0]?.body).toEqual({
    treeId: '3001',
    finding: 'issue',
    notes: 'Flag remains open.',
  });
  expect(await keys(page)).toEqual([]);
});

test('#6 notes of only spaces are sent as null', async ({ open }) => {
  const { page, findings } = await visit(open);

  await notes(page).fill('   ');
  await save(page).click();
  await expect.poll(() => findings.length).toBe(1);
  expect(findings[0]?.body).toEqual({ treeId: '3001', finding: 'ok', notes: null });
});

test('#7 a tree with a saved finding opens with it selected, its notes, and the rail naming it', async ({
  open,
}) => {
  const { page } = await visit(open, { bundle: () => FLAGGED }, `/app/audit/${OPEN_ID}/trees/3091`);

  await expect(page.getByRole('radio', { name: 'Follow-up' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(notes(page)).toHaveValue('Flag remains open.');
  await expect(rail(page)).toContainText('Your finding: Follow-up');
  await expect(rail(page)).toContainText('Flagged');
});

test('#8 a flagged tree has no challenge yet and cannot be challenged; a stale page is told so', async ({
  open,
}) => {
  const flagged = await visit(open, { bundle: () => FLAGGED }, `/app/audit/${OPEN_ID}/trees/3091`);

  await expect(flagged.page.getByText('NO CHALLENGE YET')).toBeVisible();
  await expect(issue(flagged.page)).toBeDisabled();

  const stale = await visit(open, {
    bundle: () => EXPIRED,
    challenge: () => failure(HTTP_CONFLICT, 'tree_not_alive'),
  });

  await issue(stale.page).click();
  await stale.page
    .getByRole('region', { name: 'Review Issue challenge' })
    .getByRole('button', { name: 'Confirm' })
    .click();
  await expect(stale.page.getByText('Only Alive trees can be challenged.')).toBeVisible();
});

test('#9 after R4M9 expired a new code can be issued; the card shows it without another bundle read', async ({
  open,
}) => {
  const { page, calls } = await visit(open, {
    bundle: () => EXPIRED,
    challenge: () => ({
      status: 201,
      body: {
        id: 'f2b8c4d6-9a1e-4c3b-8d7f-5e2a0b6c9d13',
        treeId: '3001',
        code: 'K7Q2',
        issuedAt: '2026-12-20T04:00:00.000Z',
        expiresAt: '2027-02-18T04:00:00.000Z',
        fulfilledSubmissionId: null,
        status: 'open',
      },
    }),
  });

  await issue(page).click();
  await page
    .getByRole('region', { name: 'Review Issue challenge' })
    .getByRole('button', { name: 'Confirm' })
    .click();
  await expect(rail(page)).toContainText('K7Q2');
  await expect(rail(page)).toContainText('20 Dec 2026');
  await expect(rail(page)).toContainText('18 Feb 2027');
  await expect(rail(page)).toContainText('OPEN CHALLENGE');
  await expect(page.getByText('Challenge issued to the planter')).toBeVisible();
  expect(bundleReads(calls)).toBe(1);
});

test('#10 a challenge that is already open shows the sentence, reads the bundle once more and hides the button', async ({
  open,
}) => {
  let reads = 0;
  const { page, challenges } = await visit(open, {
    bundle: () => {
      reads += 1;

      return reads === 1 ? EXPIRED : BUNDLE;
    },
    challenge: () => failure(HTTP_CONFLICT, 'challenge_active'),
  });

  await issue(page).click();
  await page
    .getByRole('region', { name: 'Review Issue challenge' })
    .getByRole('button', { name: 'Confirm' })
    .click();
  await expect(page.getByText('This tree already has an open challenge.')).toBeVisible();
  await expect(issue(page)).toHaveCount(0);
  expect(reads).toBe(2);
  expect(challenges).toHaveLength(1);
});

test('#11 a closed session refused on either write says so and turns the page read-only', async ({
  open,
}) => {
  const finding = await visit(open, { finding: () => failure(HTTP_CONFLICT, 'session_closed') });

  await save(finding.page).click();
  await expect(finding.page.getByText('This session is closed.')).toBeVisible();

  const challenge = await visit(open, {
    bundle: () => EXPIRED,
    challenge: () => failure(HTTP_CONFLICT, 'session_closed'),
  });

  await issue(challenge.page).click();
  await challenge.page
    .getByRole('region', { name: 'Review Issue challenge' })
    .getByRole('button', { name: 'Confirm' })
    .click();
  await expect(challenge.page.getByText('This session is closed.')).toBeVisible();
});

test('#12 a closed session still shows the evidence, with the finding and notes read-only', async ({
  open,
}) => {
  const { page } = await visit(
    open,
    { session: () => CLOSED_SESSION, bundle: () => CLOSED },
    `/app/audit/${CLOSED_ID}/trees/3001`,
  );

  await expect(page.locator('dd', { hasText: 'OK' }).first()).toBeVisible();
  await expect(page.getByText('Planting and month-3 evidence consistent.').first()).toBeVisible();
  await expect(save(page)).toHaveCount(0);
  await expect(issue(page)).toBeDisabled();
});

test('#13 a tree outside the sample says so and no bundle is requested', async ({ open }) => {
  const { page, calls } = await visit(open, {}, `/app/audit/${OPEN_ID}/trees/3020`);

  await expect(page.getByText('Tree not in this sample')).toBeVisible();
  expect(bundleReads(calls)).toBe(0);
});

test('#14 a failed video hash shows the recomputed value; an unrun check shows a dash, never a tick', async ({
  open,
}) => {
  const failed = await visit(open, {
    bundle: () => verifying({ videoHashMatches: false, recomputedSha256: 'ab12…' }),
  });

  await expect(
    failed.page.locator('li.bad', { hasText: 'Video bytes match the signed SHA-256' }),
  ).toContainText('ab12…');

  const unrun = await visit(open, { bundle: () => verifying({ signatureValid: null }) });
  const row = unrun.page.locator('li', { hasText: 'Device signature over the payload' }).last();

  await expect(row).toContainText('—');
  await expect(row.locator('[data-copy="COPY-305"]')).toBeVisible();
  await expect(row).not.toContainText('✓');
});

test('#15 typed notes survive a reload and are gone after sign-out', async ({ open }) => {
  const { page } = await visit(open);

  await notes(page).fill('A note for later');
  await page.reload();
  await signInWith(page, meBody(AUDITOR), { returnTo: PATH });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await goInApp(page, PATH);
  await expect(notes(page)).toHaveValue('A note for later');
  await page.locator('summary[aria-label^="Account"]').click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect.poll(() => keys(page)).toEqual([]);
});
