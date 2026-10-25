// docs/FE/features/s29-resolve-flag.md §7: one test per criterion #1..#14, in the browser, under the docs/FE/fidelity.md §2
// conditions. Sign-in uses the real Privy test account (backend/.env); the flag, the resolve write and the job are answered by
// the spec with the flags.md §2 example (the backend does not run).
import type { Page } from '@playwright/test';
import { meBody } from './fixtures/accounts';
import { OPERATOR } from './fixtures/evidence';
import { FLAG_OPEN, RESOLVE_JOB, flagWith, resolutionJob } from './fixtures/operations';
import { failure } from './helpers/api';
import { FLAG_PATH, openFlag } from './helpers/flag-page';
import { expect, refocus, signInWith, test } from './helpers/flow';

const TEST_MS = 120_000;
const DISMISS_NOTE = 'Site visit confirmed the tree is alive and in place';
const HTTP_CONFLICT = 409;

test.describe.configure({ timeout: TEST_MS });

const fact = (page: Page, name: string) =>
  page
    .locator('.ws-facts > div')
    .filter({ has: page.locator('dt', { hasText: new RegExp(`^${name}$`, 'u') }) })
    .locator('dd');

const note = (page: Page) => page.getByLabel('Resolution note · 3–2,000 characters');

const decision = (page: Page) => page.getByLabel('Decision');

const trigger = (page: Page) =>
  page.locator('section.ws-panel').getByRole('button', { name: 'Resolve flag', exact: true });

const review = (page: Page) => page.getByRole('region', { name: 'Review Resolve flag' });

const pending = 'Resolution pending. Review the job before another decision.';

/** The dismissal typed and "Resolve flag" pressed: the D14 is open. */
const toReview = async (page: Page, text = DISMISS_NOTE): Promise<void> => {
  await note(page).fill(text);
  await trigger(page).click();
};

test('#1 the example shows the flag, its tag, the facts and the way to the tree', async ({
  open,
}) => {
  const { page } = await openFlag(open);

  await expect(page.getByRole('heading', { name: 'Resolve tree flag' })).toBeVisible();
  await expect(page.getByText('Tree #3091 · Flag #1f6c2a9e')).toBeVisible();
  await expect(page.locator('.ws-panel').first()).toContainText('Open');
  await expect(fact(page, 'Campaign')).toHaveText('Roots that stay');
  await expect(fact(page, 'Reason')).toHaveText('Tree condition needs an independent check.');
  await expect(fact(page, 'Opened')).toHaveText('20 Oct 2026');
  await expect(fact(page, 'Reason hash / contributor')).toHaveText('0xc29b…11cb / 0x9a4c…6f5a');
  await expect(fact(page, 'Previous status')).toHaveText('Alive');
  await expect(fact(page, 'Payouts / clock')).toHaveText('Paused');
  await expect(page.getByRole('link', { name: 'Tree history' })).toHaveAttribute(
    'href',
    '/trees/3091',
  );
});

test('#2 a flag of another tree says so; a malformed flag id says so with no request', async ({
  open,
}) => {
  const missing = await openFlag(open, { flag: () => failure(404, 'not_found') });

  await expect(missing.page.getByText('Flag not found for this tree')).toBeVisible();

  const bad = await openFlag(open, { path: '/app/operator/trees/3091/flags/1' });

  await expect(bad.page.getByText('Flag not found for this tree')).toBeVisible();
  expect(bad.calls.filter(({ path }) => path.includes('/flags/'))).toEqual([]);
});

test('#3 a note of two characters keeps "Resolve flag" disabled; three enables it', async ({
  open,
}) => {
  const { page } = await openFlag(open);

  await note(page).fill('ok');
  await expect(trigger(page)).toBeDisabled();
  await note(page).fill('ok!');
  await expect(trigger(page)).toBeEnabled();
});

test('#4 the dismiss review says what happens; Cancel sends nothing', async ({ open }) => {
  const { page, resolves } = await openFlag(open);

  await toReview(page);
  await expect(review(page)).toContainText(
    'Restore the prior status after confirmation; chain adjusts the paused schedule.',
  );
  await review(page).getByRole('button', { name: 'Cancel' }).click();
  expect(resolves).toEqual([]);
});

test('#5 Confirm sends the dismissal with no Idempotency-Key, then the page shows the pending job and no form', async ({
  open,
}) => {
  let current: object = FLAG_OPEN;
  const { page, resolves } = await openFlag(open, {
    flag: () => current,
    resolve: () => ({ status: 202, body: { job: resolutionJob('pending') } }),
  });

  await toReview(page);
  await review(page).getByRole('button', { name: 'Confirm' }).click();
  await expect(
    page.getByText('Done. Resolve flag is on its way; its status updates here.'),
  ).toBeVisible();
  // the next read finds the job: the form gives way to the pending line
  current = flagWith({ resolutionJob: resolutionJob('sent') });
  await refocus(page);
  await expect(page.getByText(pending)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Track job' })).toHaveAttribute(
    'href',
    `/app/jobs/${RESOLVE_JOB}`,
  );
  await expect(note(page)).toHaveCount(0);
  expect(resolves[0]?.path).toBe('/operator/flags/1f6c2a9e-4b7d-4e15-9a3c-8d2e5f0b7a61/resolve');
  expect(resolves[0]?.body).toEqual({ uphold: false, note: DISMISS_NOTE });
  expect(resolves[0]?.headers['idempotency-key']).toBeUndefined();
});

test('#6 the uphold review names the tree and says it becomes Removed', async ({ open }) => {
  const { page } = await openFlag(open);

  await decision(page).selectOption('uphold');
  await toReview(page);
  await expect(review(page)).toContainText(
    'Tree becomes Removed after confirmation; unpaid incentives return to the campaign pool.',
  );
  await expect(review(page)).toContainText('#3091');
});

test('#7 a confirmed job on a flag that is still open still shows the pending line', async ({
  open,
}) => {
  const { page } = await openFlag(open, {
    flag: () => flagWith({ resolutionJob: resolutionJob('confirmed') }),
  });

  await expect(page.getByText(pending)).toBeVisible();
  await expect(note(page)).toHaveCount(0);
});

test('#8 a dismissed or upheld flag shows its tag and the note, and no form', async ({ open }) => {
  const dismissed = await openFlag(open, {
    flag: () =>
      flagWith({
        flag: { status: 'dismissed', resolutionNote: DISMISS_NOTE },
        tree: { status: 'alive' },
      }),
  });

  await expect(dismissed.page.locator('.ws-panel').first()).toContainText('dismissed');
  await expect(dismissed.page.getByText(`Resolved · ${DISMISS_NOTE}`)).toBeVisible();
  await expect(note(dismissed.page)).toHaveCount(0);

  const upheld = await openFlag(open, {
    flag: () =>
      flagWith({
        flag: { status: 'upheld', resolutionNote: 'Removed after a visit' },
        tree: { status: 'removed' },
      }),
  });

  await expect(upheld.page.locator('.ws-panel').first()).toContainText('upheld');
  await expect(upheld.page.getByText(/^Resolved · /u)).toBeVisible();
  await expect(note(upheld.page)).toHaveCount(0);
});

test('#9 a failed job offers the form again with the last error', async ({ open }) => {
  const { page } = await openFlag(open, {
    flag: () =>
      flagWith({ resolutionJob: resolutionJob('failed', { lastError: 'Worker failure' }) }),
  });

  await expect(note(page)).toBeVisible();
  await expect(fact(page, 'Last error')).toHaveText('Worker failure');
});

test('#10 a resolution already pending shows the sentence and the re-read replaces the form', async ({
  open,
}) => {
  let current: object = FLAG_OPEN;
  const { page } = await openFlag(open, {
    flag: () => current,
    resolve: () => failure(HTTP_CONFLICT, 'flag_resolution_pending'),
  });

  await toReview(page);
  await review(page).getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByRole('alert').first()).toContainText(pending);
  current = flagWith({ resolutionJob: resolutionJob('sent') });
  await refocus(page);
  await expect(note(page)).toHaveCount(0);
  await expect(page.getByText(pending).first()).toBeVisible();
});

test('#11 a flag whose reason is saved but not on the chain yet says so, with no form', async ({
  open,
}) => {
  const { page } = await openFlag(open, {
    flag: () => flagWith({ flag: { status: 'pending' }, tree: { status: 'alive' } }),
  });

  await expect(page.locator('.ws-panel').first()).toContainText('pending');
  await expect(page.locator('[data-copy="COPY-250"]')).toBeVisible();
  await expect(note(page)).toHaveCount(0);
});

test('#12 a tree that is not flagged any more reads "See current tree state"', async ({ open }) => {
  const { page } = await openFlag(open, { flag: () => flagWith({ tree: { status: 'alive' } }) });

  await expect(fact(page, 'Payouts / clock')).toHaveText('See current tree state');
});

test('#13 the typed note and decision survive a reload and are gone after sign-out', async ({
  open,
}) => {
  const { page } = await openFlag(open);

  await decision(page).selectOption('uphold');
  await note(page).fill(DISMISS_NOTE);
  await page.reload();
  await signInWith(page, meBody(OPERATOR), { returnTo: FLAG_PATH });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await expect(note(page)).toHaveValue(DISMISS_NOTE);
  await expect(decision(page)).toHaveValue('uphold');
  await page.locator('summary[aria-label^="Account"]').click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((key) => key.includes('treecord:draft:')),
    ),
  ).toEqual([]);
});

test('#14 while the write is in flight Confirm and Cancel are disabled and the region is busy', async ({
  open,
}) => {
  const gate = Promise.withResolvers<void>();
  const { page } = await openFlag(open, {
    resolve: () => ({ status: 202, body: { job: resolutionJob('pending') } }),
  });

  await page.route('**/api/v1/operator/flags/**', async (route) => {
    if (route.request().method() === 'POST') {
      await gate.promise;
    }

    await route.fallback();
  });
  await toReview(page);
  await review(page).getByRole('button', { name: 'Confirm' }).click();
  await expect(review(page)).toHaveAttribute('aria-busy', 'true');
  await expect(review(page).locator('button[aria-busy="true"]')).toBeDisabled();
  await expect(review(page).getByRole('button', { name: 'Cancel' })).toBeDisabled();
  gate.resolve();
  await expect(
    page.getByText('Done. Resolve flag is on its way; its status updates here.'),
  ).toBeVisible();
});
