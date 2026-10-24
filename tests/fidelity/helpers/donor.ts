// `GET /api/v1/donor/*` for the S13 spec (docs/FE/features/s13-donor-home.md §7): answered by the spec, each request's
// URL recorded so a spec can count and read the calls. The backend does not run.
import type { Page } from '@playwright/test';
import { API_CORS } from './privy';

const NO_CONTENT = 204;
const STATUS_OK = 200;
const JSON_TYPE = { 'Content-Type': 'application/json' };

type DonorAnswer = { status?: number; body: unknown; after?: Promise<unknown> };

/** Sees the URL asked and which of the two reads it is. */
export type DonorResponder = (call: { url: URL; read: 'dashboard' | 'campaigns' }) => DonorAnswer;

/** Answers every `GET /donor/…` (and its preflight) with `answer`; each URL asked is pushed to `calls`. */
export const answerDonor = async (
  page: Page,
  answer: DonorResponder,
  calls: URL[],
): Promise<void> => {
  await page.route('**/api/v1/donor/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: NO_CONTENT, headers: API_CORS });

      return;
    }

    const url = new URL(route.request().url());
    const read = url.pathname.endsWith('/dashboard') ? 'dashboard' : 'campaigns';

    calls.push(url);
    const { status = STATUS_OK, body, after } = answer({ url, read });

    await after;
    await route.fulfill({
      status,
      headers: { ...API_CORS, ...JSON_TYPE },
      body: JSON.stringify(body),
    });
  });
};
