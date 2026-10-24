// `GET /api/v1/evidence/:id` and `GET /evidence/capture-target` for the S21 spec: answered by the spec, each request's path
// recorded so a spec can count the polls. The backend does not run.
import type { Page } from '@playwright/test';
import { API_CORS } from './privy';

const NO_CONTENT = 204;
const STATUS_OK = 200;
const JSON_TYPE = { 'Content-Type': 'application/json' };

export type Answer = { status?: number; body: unknown };

export type EvidenceResponders = {
  /** What `GET /evidence/:id` answers for `id`, asked the `count`th time. */
  detail: (id: string, count: number) => Answer;
  target?: Answer;
};

/** Answers the detail read, the capture-target read and their preflights; each path asked is pushed to `calls`. */
export const answerDetail = async (
  page: Page,
  responders: EvidenceResponders,
  calls: string[],
): Promise<void> => {
  const counts = new Map<string, number>();

  await page.route('**/api/v1/evidence/**', async (route) => {
    const request = route.request();

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: NO_CONTENT, headers: API_CORS });

      return;
    }

    const path = new URL(request.url()).pathname.replace('/api/v1', '');

    calls.push(path);

    const id = path.split('/').at(-1) ?? '';
    const asked = (counts.get(id) ?? 0) + 1;

    counts.set(id, asked);

    const { status = STATUS_OK, body } =
      id === 'capture-target'
        ? (responders.target ?? { status: 404, body: {} })
        : responders.detail(id, asked);

    await route.fulfill({
      status,
      headers: { ...API_CORS, ...JSON_TYPE },
      body: JSON.stringify(body),
    });
  });
};
