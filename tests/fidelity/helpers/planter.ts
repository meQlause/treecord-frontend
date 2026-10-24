// `GET /api/v1/planter/*` for the planter list specs (S16, S17, S18): answered by the spec, each request's URL recorded
// so a spec can count the calls and read their query. The backend does not run.
import type { Page } from '@playwright/test';
import { API_CORS } from './privy';

const NO_CONTENT = 204;
const STATUS_OK = 200;
const JSON_TYPE = { 'Content-Type': 'application/json' };

type PlanterAnswer = { status?: number; body: unknown; after?: Promise<unknown> };

/** Sees the URL asked and which list it is (`trees`, `slots`, `challenges`). */
export type PlanterResponder = (call: { url: URL; list: string }) => PlanterAnswer;

/** Answers every `GET /planter/…` (and its preflight) with `answer`; each URL asked is pushed to `calls`. */
export const answerPlanter = async (
  page: Page,
  answer: PlanterResponder,
  calls: URL[],
): Promise<void> => {
  await page.route('**/api/v1/planter/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: NO_CONTENT, headers: API_CORS });

      return;
    }

    const url = new URL(route.request().url());

    calls.push(url);
    const {
      status = STATUS_OK,
      body,
      after,
    } = answer({ url, list: url.pathname.split('/').at(-1) ?? '' });

    await after;
    await route.fulfill({
      status,
      headers: { ...API_CORS, ...JSON_TYPE },
      body: JSON.stringify(body),
    });
  });
};

/**
 * The key record S22 keeps in IndexedDB (`treecord` / `keys`, one per profile): the spec seeds the device id of "this phone"
 * before the app loads (the app keeps no login across a reload, so it cannot be done afterwards).
 */
export const seedDeviceId = async (
  page: Page,
  profileId: string,
  deviceId: string,
): Promise<void> => {
  await page.addInitScript(
    ([profile, device]) => {
      const request = indexedDB.open('treecord', 1);

      request.onupgradeneeded = () => request.result.createObjectStore('keys');
      request.onsuccess = () => {
        request.result
          .transaction('keys', 'readwrite')
          .objectStore('keys')
          .put({ deviceId: device }, profile);
      };
    },
    [profileId, deviceId] as const,
  );
};
