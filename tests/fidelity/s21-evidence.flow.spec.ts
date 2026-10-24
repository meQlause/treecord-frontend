// docs/FE/features/s21-evidence.md §7: one test per criterion #1..#14, in the browser, under the docs/FE/fidelity.md §2
// conditions. Sign-in uses the real Privy test account; `GET /me` follows the profile of the reader the test names, and
// `GET /evidence/:id` (and capture-target) are answered by the spec with the evidence.md §4 bodies. The backend does not run.
import type { Page } from '@playwright/test';
import { SARI, type MeProfile } from './fixtures/accounts';
import type { Json } from './fixtures/campaigns';
import { FIXTURE_A, FIXTURE_B, OPERATOR, REJECTED, evidenceError } from './fixtures/evidence';
import { HELD } from './fixtures/record';
import { DEWI } from './fixtures/shell-accounts';
import { answerDetail, type Answer } from './helpers/evidence';
import { expect, settle, test, type OpenOptions } from './helpers/flow';
import { seedQueue } from './helpers/record';
import { openSignedIn } from './helpers/signed-in';

const ROW = 'S21';
const TEST_MS = 120_000;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const QUIET_MS = 8000;
const POLL_MS = 7000;
const PIXEL = Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');

test.describe.configure({ timeout: TEST_MS });

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

type Setup = {
  id?: string;
  reader?: MeProfile;
  detail?: (id: string, count: number) => Answer;
  target?: Answer;
  clip?: boolean;
};

const served = (body: Json): Answer => ({ body });

const openEvidence = async (open: Open, setup: Setup = {}) => {
  const calls: string[] = [];
  const id = setup.id ?? HELD;
  const { page } = await openSignedIn(
    open,
    { row: ROW, profile: setup.reader ?? SARI, path: `/app/evidence/${id}` },
    async (target) => {
      if (setup.clip === true) {
        await seedQueue(target, [{ id }]);
      }

      await target.route('http://localhost:9000/**', (route) =>
        route.fulfill({ status: 200, contentType: 'image/gif', body: PIXEL }),
      );
      await answerDetail(
        target,
        {
          detail: setup.detail ?? (() => served(FIXTURE_A)),
          ...(setup.target === undefined ? {} : { target: setup.target }),
        },
        calls,
      );
    },
  );

  return { page, calls };
};

const stages = (page: Page) => page.locator('.pl-stage li');

const asRejected = (changes: Json): ((id: string) => Answer) => {
  return () => served({ ...FIXTURE_B, ...changes });
};

test('#1 the heading names the evidence, its state and what that means', async ({ open }) => {
  const { page } = await openEvidence(open);

  await expect(page.locator('.page-heading .eyebrow')).toContainText(
    'EVIDENCE · ALIVE · TREE #3104',
  );
  await expect(page.locator('.hero-coordinate')).toHaveText('EVIDENCE / 5C1E9A7D');
  await expect(page.locator('h1')).toContainText('in review.');
  await expect(page.locator('h1')).toContainText('Evidence,');
  await expect(page.locator('.page-heading [aria-live]')).toHaveText(
    'Borderline scores. An operator reviews it.',
  );
});

test('#2 the policy box and the gauges read the scores against their pass lines', async ({
  open,
}) => {
  const { page } = await openEvidence(open);
  const gauge = (label: string) => page.locator('.pl-score', { hasText: label });

  await expect(page.locator('.pl-policy')).toContainText('8,550');
  await expect(page.locator('.pl-policy')).toContainText('needs review · of 10,000');
  await expect(gauge('Liveness')).toContainText('0.75');
  await expect(gauge('Liveness')).toContainText('pass ≥ 0.80 · borderline');
  await expect(gauge('Recapture')).toContainText('0.08');
  await expect(gauge('Recapture')).toContainText('pass ≤ 0.20');
  await expect(gauge('Growth')).toContainText('0.82');
  await expect(gauge('Challenge code')).toHaveCount(0);
  await expect(gauge('Tree tag read')).toContainText('1.00');
  await expect(page.locator('.pl-note')).toContainText(
    'Borderline: Liveness is borderline. An operator decides before the milestone counts.',
  );
  await expect(page.locator('.pl-note')).toContainText('treecord-ai-0.1');
});

test('#3 the verdict counts the prechecks and the pipeline stands on "Scored"', async ({
  open,
}) => {
  const { page } = await openEvidence(open);
  const card = page.locator('.cb-stock-card');

  await expect(card).toContainText('Prechecks passed');
  await expect(card).toContainText('14/14');
  await expect(card).toContainText('checks');
  await expect(card).toContainText('Video7 s ALIVE');
  await expect(card.getByRole('progressbar', { name: 'Pipeline' })).toHaveAttribute(
    'aria-valuenow',
    '60',
  );
  await expect(card).toContainText('Operator review · step 3 of 5');
  await expect(stages(page).nth(0)).toHaveClass(/done/u);
  await expect(stages(page).nth(1)).toHaveClass(/done/u);
  await expect(stages(page).nth(2)).toHaveClass(/now/u);
});

test('#4 without a local clip the server keyframes show, timed, and no video exists', async ({
  open,
}) => {
  const { page } = await openEvidence(open);
  const strip = page.locator('.pl-frames');

  await expect(strip.locator('image')).toHaveCount(3);
  await expect(strip).toContainText('0.0 s');
  await expect(strip).toContainText('3.5 s');
  await expect(strip).toContainText('7.0 s');
  await expect(strip).toContainText('Video kept on the server');
  await expect(page.locator('video')).toHaveCount(0);
});

test('#5 the signed record shows the exact GPS with its map link, and the prechecks their values', async ({
  open,
}) => {
  const { page } = await openEvidence(open);
  const gps = page.getByRole('link', { name: '-7.424298, 109.239893 ↗' });
  const checks = page.locator('.ev-checks li');

  await expect(gps).toHaveAttribute(
    'href',
    'https://www.openstreetmap.org/?mlat=-7.424298&mlon=109.239893#map=18/-7.424298/109.239893',
  );
  await expect(page.locator('.cb-record', { hasText: 'Signed record' })).toContainText('±8.4 m');
  await expect(checks.filter({ hasText: 'GPS accuracy 300 m or better' })).toContainText('✓');
  await expect(checks.filter({ hasText: 'GPS accuracy 300 m or better' })).toContainText('8.4 m');
  await expect(
    checks.filter({ hasText: 'Within 15 m of where the tree was planted' }),
  ).toContainText('3.2 m away');
  await expect(checks.filter({ hasText: 'Milestone not checked in yet' })).toContainText('free');
  await expect(checks.filter({ hasText: 'Carries tree tag TC-M3XV-7GPD' })).toContainText('✓');
});

test('#6 "Review submission" is the operator\'s, for a submission in review', async ({ open }) => {
  const planter = await openEvidence(open);

  await expect(planter.page.locator('.pl-stage')).toBeVisible();
  await expect(planter.page.getByRole('link', { name: 'Review submission' })).toHaveCount(0);

  const operator = await openEvidence(open, { reader: OPERATOR });
  const review = operator.page.getByRole('link', { name: 'Review submission' });

  await expect(review).toHaveAttribute('href', `/app/operator/submissions/${HELD}`);
});

test('#7 a submission turned back at the prechecks says so, row by row', async ({ open }) => {
  const { page } = await openEvidence(open, { id: REJECTED, detail: () => served(FIXTURE_B) });
  const checks = page.locator('.ev-checks li');

  await expect(page.locator('h1')).toContainText('turned back.');
  await expect(page.locator('.page-heading [aria-live]')).toHaveText(
    'Rejected before scoring: GPS accuracy too low.',
  );
  await expect(checks.filter({ hasText: 'GPS accuracy 300 m or better' })).toContainText('✕');
  await expect(checks.filter({ hasText: 'GPS accuracy 300 m or better' })).toContainText(
    '341.0 m · gps_inaccurate',
  );
  await expect(stages(page).nth(1)).toHaveClass(/bad/u);
  await expect(page.locator('.cb-stock-card')).toContainText('Status');
  await expect(page.locator('.cb-stock-card')).toContainText('Rejected');
  await expect(
    page.locator('.cb-stock-card').getByRole('progressbar', { name: 'Pipeline' }),
  ).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByText('Not scored')).toBeVisible();
  await expect(page.getByText('Turned back by the prechecks before any model ran.')).toBeVisible();
});

test('#8 "Record again" shows only while the server still allows the target', async ({ open }) => {
  const allowed = await openEvidence(open, {
    id: REJECTED,
    detail: () => served(FIXTURE_B),
    target: served({ allowed: true }),
  });
  const link = allowed.page.getByRole('link', { name: 'Record again' });

  await expect(link).toHaveAttribute('href', '/app/planter/record?tree=3001&kind=ALIVE');

  const blocked = await openEvidence(open, {
    id: REJECTED,
    detail: () => served(FIXTURE_B),
    target: served({ allowed: false }),
  });

  await expect.poll(() => blocked.calls.some((path) => path.endsWith('capture-target'))).toBe(true);
  await expect(blocked.page.getByRole('link', { name: 'Record again' })).toHaveCount(0);
});

test('#9 every reason of a rejected planting is named, in the server order', async ({ open }) => {
  const { page } = await openEvidence(open, {
    id: REJECTED,
    detail: asRejected({
      kind: 'PLANTED',
      treeId: null,
      slotId: '41',
      rejectReasons: ['gps_inaccurate', 'outside_region'],
    }),
  });

  await expect(page.locator('.page-heading [aria-live]')).toHaveText(
    'Rejected before scoring: GPS accuracy too low, Outside the campaign region.',
  );
});

test('#10 a checking submission moves on by polling, and polling stops at on-chain', async ({
  open,
}) => {
  const checking = {
    ...FIXTURE_A,
    status: 'checking',
    ai: null,
    pipeline: { step: 2, failedAt: null },
  };
  const { page, calls } = await openEvidence(open, {
    detail: (_id, count) => {
      if (count < 2) {
        return served(checking);
      }

      return served(
        count < 3
          ? { ...FIXTURE_A, status: 'scored' }
          : { ...FIXTURE_A, status: 'onchain', pipeline: { step: 5, failedAt: null } },
      );
    },
  });
  const note = page.locator('.page-heading [aria-live]');

  await expect(note).toHaveText(
    'Prechecks passed. Waiting for AI scoring (liveness, recapture, tree presence, growth).',
  );
  await expect(page.getByText('Scoring', { exact: true })).toBeVisible();
  await expect(note).toHaveText('Scored. The platform signs the attestation next.', {
    timeout: POLL_MS,
  });
  await expect(note).toHaveText('Recorded on-chain. The milestone counts.', { timeout: POLL_MS });

  const seen = calls.length;

  await settle(page, QUIET_MS);
  expect(calls).toHaveLength(seen);
});

test('#11 "Processing failed" shows its raw error to an operator only', async ({ open }) => {
  const failed = {
    ...FIXTURE_A,
    status: 'failed',
    pipeline: { step: 3, failedAt: 'scored' },
    error: 'AI 400: bad input',
  };
  const planter = await openEvidence(open, { detail: () => served(failed) });

  await expect(planter.page.locator('.page-heading [aria-live]')).toContainText(
    'Processing failed',
  );
  await expect(planter.page.getByText('AI 400: bad input')).toHaveCount(0);

  const operator = await openEvidence(open, { reader: OPERATOR, detail: () => served(failed) });

  await expect(operator.page.getByText('AI 400: bad input')).toBeVisible();
});

test('#12 an operator rejection shows their note in the heading and in the AI note', async ({
  open,
}) => {
  const { page } = await openEvidence(open, {
    detail: () =>
      served({
        ...FIXTURE_A,
        status: 'rejected',
        policyDecision: 'reject',
        rejectReasons: ['liveness_borderline', 'operator_rejected'],
        review: { note: 'Seedling not in frame.', decision: 'rejected' },
        pipeline: { step: 3, failedAt: 'scored' },
      }),
  });

  await expect(page.locator('.page-heading [aria-live]')).toHaveText(
    'Rejected: Seedling not in frame.',
  );
  await expect(page.locator('.pl-note')).toContainText('Operator note: “Seedling not in frame.”.');
});

test('#13 a bad id or an unknown submission is "Evidence not found"', async ({ open }) => {
  const bad = await openEvidence(open, {
    id: 'abc',
    detail: () => ({ status: HTTP_BAD_REQUEST, body: evidenceError('invalid_path') }),
  });

  await expect(bad.page.locator('.ws-empty h2')).toHaveText('Evidence not found');

  const unknown = await openEvidence(open, {
    id: REJECTED,
    detail: () => ({ status: HTTP_NOT_FOUND, body: evidenceError('not_found') }),
  });

  await expect(unknown.page.locator('.ws-empty h2')).toHaveText('Evidence not found');
});

test('#14 the owner plays the clip this phone holds; an auditor reads it with "View tree" only', async ({
  open,
}) => {
  const owner = await openEvidence(open, { clip: true });

  await expect(owner.page.locator('video.ev-thumb')).toHaveAttribute('src', /^blob:/u);
  await expect(owner.page.locator('.pl-frames')).toHaveCount(0);

  const auditor = await openEvidence(open, { reader: DEWI });

  await expect(auditor.page.getByRole('link', { name: 'View tree' })).toBeVisible();
  await expect(auditor.page.getByRole('link', { name: 'Review submission' })).toHaveCount(0);
  await expect(auditor.page.getByRole('link', { name: 'Record again' })).toHaveCount(0);
});
