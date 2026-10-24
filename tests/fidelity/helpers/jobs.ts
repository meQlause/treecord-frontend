// `GET /api/v1/jobs/:id` for the S12 spec (docs/FE/features/s12-job.md §7): answered by the spec, one call recorded per
// request, so a spec can count the polls. The backend does not run.
import type { Page } from '@playwright/test';
import { API_CORS } from './privy';

const NO_CONTENT = 204;
const STATUS_OK = 200;
const JSON_TYPE = { 'Content-Type': 'application/json' };

type JobAnswer = { status?: number; body: unknown };

/** Sees the number of the request (1 for the first) and the id asked for. */
export type JobResponder = (call: { n: number; id: string }) => JobAnswer;

/** Answers every `GET /jobs/:id` (and its preflight) with `answer`; each asked id is pushed to `asked`. */
export const answerJobs = async (
  page: Page,
  answer: JobResponder,
  asked: string[],
): Promise<void> => {
  await page.route('**/api/v1/jobs/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: NO_CONTENT, headers: API_CORS });

      return;
    }

    const id = new URL(route.request().url()).pathname.split('/').at(-1) ?? '';

    asked.push(id);
    const { status = STATUS_OK, body } = answer({ n: asked.length, id });

    await route.fulfill({
      status,
      headers: { ...API_CORS, ...JSON_TYPE },
      body: JSON.stringify(body),
    });
  });
};
