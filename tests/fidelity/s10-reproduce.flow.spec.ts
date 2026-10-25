// docs/FE/features/s10-reproduce.md §8: one test per criterion #1..#11 in the browser (#12 is the unit test of the shared vectors,
// tests/unit/features/audit/audit.rules.test.ts), under the docs/FE/fidelity.md §2 conditions. The page is public: nobody signs in.
// `GET /audit/sessions/:id/reproduce` is answered by the spec with the audit.md §9 bodies (the backend does not run); the
// recomputation is the app's own, in its worker.
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { CLOSED_ID, OPEN_ID } from './fixtures/audit';
import { REPRODUCE_CLOSED, REPRODUCE_OPEN, REPORT, SUMMARY } from './fixtures/audit-report';
import type { Json } from './fixtures/campaigns';
import { answerApi, failure, type ApiAnswer, type ApiCall } from './helpers/api';
import { expect, test, type OpenOptions } from './helpers/flow';

const TEST_MS = 120_000;
const FLIP = 'Flip one bit of the block hash';
const RESTORE = 'Restore the real block hash';
const UNAVAILABLE = 503;
const POPULATION = 5000;

test.describe.configure({ timeout: TEST_MS });

type Seen = { page: Page; calls: ApiCall[] };

/** Opens `/audit/:id/reproduce` signed out, answering with `body` (or the answer given). */
const visit = async (
  open: (options?: OpenOptions) => Promise<{ page: Page }>,
  id: string,
  body: Json | ApiAnswer,
): Promise<Seen> => {
  const { page } = await open({ row: 'S10' });
  const answer: ApiAnswer =
    typeof (body as ApiAnswer).status === 'number' ? (body as ApiAnswer) : { body };
  const calls = await answerApi(page, () => answer);

  await page.goto(`/audit/${id}/reproduce`);

  return { page, calls };
};

const results = (page: Page) => page.locator('.cb-detail');

const flip = (page: Page) => page.getByRole('button', { name: FLIP });

test('#1 the page is public: the heading and the short id show, and no Authorization header is sent', async ({
  open,
}) => {
  const { page, calls } = await visit(open, OPEN_ID, REPRODUCE_OPEN);

  await expect(
    page.getByText('PUBLIC REPRODUCTION · KALIMANTAN MANGROVE RESTORATION'),
  ).toBeVisible();
  await expect(page.getByText('REPRODUCE / E9219997')).toBeVisible();
  expect(calls.length).toBeGreaterThan(0);
  expect(calls.every(({ headers }) => headers['authorization'] === undefined)).toBe(true);
});

test('#2 the worker recomputes the seed and the sample, and they match the stored ones', async ({
  open,
}) => {
  const { page } = await visit(open, OPEN_ID, REPRODUCE_OPEN);

  await expect(results(page)).toContainText('block #17,000,015');
  await expect(results(page)).toContainText('0x09c2dea7…d75778');
  await expect(results(page)).toContainText('7 trees');
  await expect(results(page).getByText('3001, 3091, 3104')).toHaveCount(3);
  await expect(page.getByText('Match').first()).toBeVisible();
});

test('#3 an open session has no report hash, no notes and no report check', async ({ open }) => {
  const { page } = await visit(open, OPEN_ID, REPRODUCE_OPEN);

  await expect(results(page)).toContainText('Session not closed yet');
  await expect(page.getByText('Private notes', { exact: true })).toBeVisible();
  await expect(page.getByText('Report check')).toBeVisible();
});

/** Counts the messages the page posts to workers. */
const countWorkerPosts = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const posts: unknown[] = [];
    const original = Worker.prototype.postMessage;

    Object.assign(window, { workerPosts: posts });
    Worker.prototype.postMessage = function post(this: Worker, ...args: [unknown]) {
      posts.push(args[0]);

      return original.apply(this, args as never);
    };
  });
};

const posts = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as { workerPosts: unknown[] }).workerPosts.length);

test('#4 flipping one bit changes the block hash, the sample and the verdict, and sends no request', async ({
  open,
}) => {
  const { page, calls } = await visit(open, OPEN_ID, REPRODUCE_OPEN);

  await expect(page.getByText('Match').first()).toBeVisible();

  const before = calls.length;

  await flip(page).click();
  await expect(results(page)).toContainText('e735a4cc');
  await expect(results(page).locator('dd', { hasText: '3020, 3091, 3001' })).toBeVisible();
  await expect(page.getByText('Mismatch').first()).toBeVisible();
  await expect(page.getByText('Tampered input')).toBeVisible();
  expect(calls).toHaveLength(before);
});

test('#5 restoring the real hash shows the match again without another recomputation', async ({
  open,
}) => {
  const { page } = await visit(open, OPEN_ID, REPRODUCE_OPEN);

  await countWorkerPosts(page);
  await page.reload();
  await expect(page.getByText('Match').first()).toBeVisible();
  await flip(page).click();
  await expect(page.getByText('Mismatch').first()).toBeVisible();

  const afterFlip = await posts(page);

  await page.getByRole('button', { name: RESTORE }).click();
  await expect(page.getByText('Match').first()).toBeVisible();
  expect(await posts(page)).toBe(afterFlip);
});

test('#6 a closed session matches on the sample, the report hash and the sealed notes', async ({
  open,
}) => {
  const { page } = await visit(open, CLOSED_ID, REPRODUCE_CLOSED);

  await expect(results(page).getByText('3091, 3001')).toHaveCount(3);
  await expect(results(page)).toContainText(
    '0x97eb3c933091e9f179119cb8a4396c7301c1ccc911fa4573ccce6ffd1d2c5341',
  );
  await expect(results(page)).toContainText('Sealed, not published · 0x60b1ce72…14d545');
  await expect(page.getByText('Match')).toHaveCount(2);
});

test('#7 a report with one changed character fails its re-hash and is not regenerated', async ({
  open,
}) => {
  const tampered = {
    ...REPRODUCE_CLOSED,
    report: {
      ...REPORT,
      findings: [
        { ...(REPORT.findings as Json[])[0], finding: 'issue' },
        (REPORT.findings as Json[])[1],
      ],
    },
  };
  const { page } = await visit(open, CLOSED_ID, tampered);

  await expect(page.getByText('Mismatch')).toBeVisible();
  await expect(results(page)).toContainText(
    '0x97eb3c933091e9f179119cb8a4396c7301c1ccc911fa4573ccce6ffd1d2c5341',
  );
});

test('#8 no text of the page carries the private notes or the summary', async ({ open }) => {
  const { page } = await visit(open, CLOSED_ID, REPRODUCE_CLOSED);

  await expect(page.getByText('Match')).toHaveCount(2);

  const text = await page.locator('body').innerText();

  expect(text).not.toContain('Flag remains open.');
  expect(text).not.toContain(SUMMARY);
});

test('#9 an unknown session says so; a malformed id says so without a request', async ({
  open,
}) => {
  const missing = await visit(open, OPEN_ID, failure(404, 'not_found'));

  await expect(missing.page.getByText('Session not found')).toBeVisible();

  const bad = await visit(open, 'not-a-uuid', REPRODUCE_OPEN);

  await expect(bad.page.getByText('Session not found')).toBeVisible();
  expect(bad.calls).toEqual([]);
});

test('#10 a 503 shows the error with Try again', async ({ open }) => {
  const { page } = await visit(open, OPEN_ID, failure(UNAVAILABLE, 'service_unavailable'));

  await expect(page.getByText('Could not load this page')).toBeVisible();
  await expect(page.getByText('Your inputs and local records are unchanged.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('#11 a 5,000-tree population is recomputed in the worker and the button answers within a frame', async ({
  open,
}) => {
  const population = Array.from({ length: POPULATION }, (...[, index]) => String(index + 1));
  const { page } = await visit(open, OPEN_ID, { ...REPRODUCE_OPEN, population });

  await flip(page).click();
  await expect(flip(page).or(page.getByRole('button', { name: RESTORE }))).toHaveAttribute(
    'aria-pressed',
    'true',
    {
      timeout: 1000,
    },
  );
  expect(readFileSync('src/features/audit/reproduce.page.tsx', 'utf8')).not.toContain(
    'sampleTreeIds',
  );
  await expect(page.getByText('Tampered input')).toBeVisible();
});
