// docs/FE/features/s28-review.md §7: one test per criterion #1..#12, in the browser, under the docs/FE/fidelity.md §2 conditions.
// Sign-in uses the real Privy test account (backend/.env); `GET /evidence/:id`, the review write and the job are answered by the
// spec with the evidence.md §4 example (the backend does not run).
import type { Page } from '@playwright/test';
import { meBody } from './fixtures/accounts';
import { FIXTURE_A, OPERATOR } from './fixtures/evidence';
import { JOB, job } from './fixtures/operations';
import { failure } from './helpers/api';
import { expect, signInWith, test } from './helpers/flow';
import { HELD, openReview } from './helpers/review-page';

const TEST_MS = 120_000;
const NOTE = 'Seedling clearly visible, camera shake explains liveness.';
const REJECT_NOTE = 'Seedling not in frame.';
const HTTP_CONFLICT = 409;
const SUBMISSION = `/app/operator/submissions/${HELD}`;

test.describe.configure({ timeout: TEST_MS });

const fact = (page: Page, name: string) =>
  page
    .locator('.ws-facts > div')
    .filter({ has: page.locator('dt', { hasText: new RegExp(`^${name}$`, 'u') }) })
    .locator('dd');

const note = (page: Page) => page.getByLabel('Review note · required');

const decision = (page: Page) => page.getByLabel('Decision');

const trigger = (page: Page, name: string) =>
  page.locator('section.ws-panel').getByRole('button', { name, exact: true });

const review = (page: Page, name: string) => page.getByRole('region', { name: `Review ${name}` });

const reviewed = (status: string, text: string, changes = {}) => ({
  ...FIXTURE_A,
  status,
  review: { note: text, reviewedAt: '2026-10-23T03:00:00.000Z', decision: 'approved' },
  jobId: JOB,
  ...changes,
});

/** The facts of the evidence.md §4 example, as the review lists them. */
const expectFacts = async (page: Page): Promise<void> => {
  await expect(fact(page, 'Tree')).toHaveText('#3104');
  await expect(fact(page, 'Kind')).toHaveText('ALIVE · month 6');
  await expect(fact(page, 'Policy decision')).toHaveText('needs review');
  await expect(fact(page, 'Policy score')).toHaveText('8,550 / 10,000');
  await expect(fact(page, 'Liveness · higher is better')).toHaveText('0.75');
  await expect(fact(page, 'Tree presence · higher is better')).toHaveText('0.94');
  await expect(fact(page, 'Recapture / duplicate · lower is better')).toHaveText('0.08 / 0.05');
  await expect(fact(page, 'Growth')).toHaveText('0.82');
  await expect(fact(page, 'Tree tag')).toHaveText('TC-M3XV-7GPD · read in the video');
  await expect(fact(page, 'Model')).toHaveText('treecord-ai-0.1');
};

test('#1 the example shows the title, the tag, the facts, the reason and the link to the full submission', async ({
  open,
}) => {
  const { page } = await openReview(open);

  await expect(page.getByRole('heading', { name: 'Submission review' })).toBeVisible();
  await expect(page.getByText(HELD, { exact: true }).first()).toBeVisible();
  await expect(page.locator('.ws-panel').first()).toContainText('needs review');
  await expectFacts(page);
  await expect(page.locator('.ws-callout')).toContainText(
    'liveness_borderline · Liveness is borderline',
  );
  await expect(page.getByRole('link', { name: 'Full submission' })).toHaveAttribute(
    'href',
    `/app/evidence/${HELD}`,
  );
});

test('#2 a malformed id, and a uuid answered 404, both say "Submission not found"', async ({
  open,
}) => {
  const bad = await openReview(open, { id: 'abc' });

  await expect(bad.page.getByText('Submission not found')).toBeVisible();
  expect(bad.calls.filter(({ path }) => path.startsWith('/evidence/'))).toEqual([]);

  const missing = await openReview(open, { evidence: () => failure(404, 'not_found') });

  await expect(missing.page.getByText('Submission not found')).toBeVisible();
});

test('#3 an unscored submission reads "Not scored" and dashes', async ({ open }) => {
  const { page } = await openReview(open, {
    evidence: () => ({ ...FIXTURE_A, ai: null, policyDecision: null, policyScore: null }),
  });

  await expect(fact(page, 'Policy decision')).toHaveText('Not scored');
  await expect(fact(page, 'Policy score')).toHaveText('—');
  await expect(fact(page, 'Liveness · higher is better')).toHaveText('—');
  await expect(fact(page, 'Tree tag')).toHaveText('TC-M3XV-7GPD · not scored yet');
});

test('#4 a blank or whitespace-only note keeps "Approve review" disabled', async ({ open }) => {
  const { page } = await openReview(open);

  await expect(trigger(page, 'Approve review')).toBeDisabled();
  await note(page).fill('   ');
  await expect(trigger(page, 'Approve review')).toBeDisabled();
  await note(page).fill(NOTE);
  await expect(trigger(page, 'Approve review')).toBeEnabled();
});

test('#5 approving sends the note with no Idempotency-Key, then shows the outcome and the job', async ({
  open,
}) => {
  let current: object = FIXTURE_A;
  const { page, reviews } = await openReview(open, {
    evidence: () => current,
    review: () => {
      current = reviewed('attested', NOTE);

      return { status: 202, body: job('attest', 'pending') };
    },
  });

  await note(page).fill(NOTE);
  await trigger(page, 'Approve review').click();
  await review(page, 'Approve review').getByRole('button', { name: 'Confirm' }).click();
  await expect(
    page.getByText('Done. Approve review is on its way; its status updates here.'),
  ).toBeVisible();
  await expect(
    page.getByText(`Approved · the attestation is on its way on-chain. ${NOTE}`),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Track job' })).toHaveAttribute(
    'href',
    `/app/jobs/${JOB}`,
  );
  expect(reviews[0]?.path).toBe(`/operator/submissions/${HELD}/review`);
  expect(reviews[0]?.body).toEqual({ approve: true, note: NOTE });
  expect(reviews[0]?.headers['idempotency-key']).toBeUndefined();
});

test('#6 rejecting sends approve false, then shows "Rejected." with the operator reason after the borderline one', async ({
  open,
}) => {
  let current: object = FIXTURE_A;
  const { page, reviews } = await openReview(open, {
    evidence: () => current,
    review: () => {
      current = reviewed('rejected', REJECT_NOTE, {
        rejectReasons: ['liveness_borderline', 'operator_rejected'],
        review: { note: REJECT_NOTE, reviewedAt: '2026-10-23T03:00:00.000Z', decision: 'rejected' },
      });

      return { status: 200, body: current };
    },
  });

  await decision(page).selectOption('reject');
  await note(page).fill(REJECT_NOTE);
  await trigger(page, 'Reject review').click();
  await review(page, 'Reject review').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText(`Rejected. ${REJECT_NOTE}`)).toBeVisible();
  await expect(page.locator('.ws-callout').first()).toContainText(
    /liveness_borderline.*operator_rejected/su,
  );
  expect(reviews[0]?.body).toEqual({ approve: false, note: REJECT_NOTE });
});

test('#7 an on-chain submission shows its outcome and no form; a scored one is not waiting for review', async ({
  open,
}) => {
  const onchain = await openReview(open, { evidence: () => reviewed('onchain', '') });

  await expect(onchain.page.getByText('On-chain · the milestone counted.')).toBeVisible();
  await expect(note(onchain.page)).toHaveCount(0);

  const scored = await openReview(open, { evidence: () => ({ ...FIXTURE_A, status: 'scored' }) });

  await expect(scored.page.getByText('Not waiting for review.')).toBeVisible();
});

test('#8 cannot_attest explains itself, keeps the note, and Reject is still possible', async ({
  open,
}) => {
  const { page } = await openReview(open, {
    review: () => ({
      status: HTTP_CONFLICT,
      body: {
        error: {
          code: 'cannot_attest',
          message: 'cannot_attest',
          details: { reasons: ['milestone_not_open'] },
        },
      },
    }),
  });

  await note(page).fill(NOTE);
  await trigger(page, 'Approve review').click();
  await review(page, 'Approve review').getByRole('button', { name: 'Confirm' }).click();
  await expect(review(page, 'Approve review').getByRole('alert')).toContainText(
    'The check-in window isn’t open',
  );
  await expect(note(page)).toHaveValue(NOTE);
  await expect(
    review(page, 'Approve review').getByRole('button', { name: 'Confirm' }),
  ).toBeDisabled();
  await decision(page).selectOption('reject');
  await expect(
    review(page, 'Reject review').getByRole('button', { name: 'Confirm' }),
  ).toBeEnabled();
});

test('#9 a submission no longer in review says so and the re-read replaces the form', async ({
  open,
}) => {
  let current: object = FIXTURE_A;
  const { page } = await openReview(open, {
    evidence: () => current,
    review: () => {
      current = reviewed('onchain', '');

      return failure(HTTP_CONFLICT, 'not_in_review');
    },
  });

  await note(page).fill(NOTE);
  await trigger(page, 'Approve review').click();
  await review(page, 'Approve review').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByRole('alert').first()).toContainText('Not waiting for review.');
  await expect(note(page)).toHaveCount(0);
});

test('#10 Cancel in the review sends nothing', async ({ open }) => {
  const { page, reviews } = await openReview(open);

  await note(page).fill(NOTE);
  await trigger(page, 'Approve review').click();
  await review(page, 'Approve review').getByRole('button', { name: 'Cancel' }).click();
  expect(reviews).toEqual([]);
});

test('#11 the typed note and decision survive a reload and are gone after sign-out', async ({
  open,
}) => {
  const { page } = await openReview(open);

  await decision(page).selectOption('reject');
  await note(page).fill(REJECT_NOTE);
  await page.reload();
  await signInWith(page, meBody(OPERATOR), { returnTo: SUBMISSION });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await expect(note(page)).toHaveValue(REJECT_NOTE);
  await expect(decision(page)).toHaveValue('reject');
  await page.locator('summary[aria-label^="Account"]').click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((key) => key.includes('treecord:draft:')),
    ),
  ).toEqual([]);
});

test('#12 a failed submission with a failed job reads "Not waiting for review." and the last error', async ({
  open,
}) => {
  const { page } = await openReview(open, {
    evidence: () => ({ ...FIXTURE_A, status: 'failed', jobId: JOB }),
    job: () => job('attest', 'failed', { lastError: 'Worker failure' }),
  });

  await expect(page.getByText('Not waiting for review.')).toBeVisible();
  await expect(page.locator('.ws-callout').last()).toContainText('Last error');
  await expect(page.locator('.ws-callout').last()).toContainText('Worker failure', {
    timeout: 15_000,
  });
});
