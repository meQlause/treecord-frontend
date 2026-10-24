// The accounts API for the S11 spec (docs/FE/features/s11-profile.md §7): `GET /me` that follows a profile the spec can
// change, and `POST /profile` answered by the spec, with the bodies it received. The backend does not run.
import type { Page } from '@playwright/test';
import { meBody, type MeProfile } from '../fixtures/accounts';
import { API_CORS } from './privy';

const NO_CONTENT = 204;
const STATUS_OK = 200;
const JSON_TYPE = { 'Content-Type': 'application/json' };

export type ProfileAnswer = { status?: number; body: unknown; after?: Promise<unknown> };

export type ProfileResponder = (body: unknown) => ProfileAnswer;

/** The profile `GET /me` answers right now: the spec reassigns `current` to change what the next read sees. */
export type MeState = { current: MeProfile };

/** `GET /me` answers `state.current`; a later route of the page wins over the sign-in harness's fixed one. */
export const meFollows = async (page: Page, state: MeState): Promise<void> => {
  await page.route('**/api/v1/me', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: NO_CONTENT, headers: API_CORS });

      return;
    }

    await route.fulfill({
      status: STATUS_OK,
      headers: { ...API_CORS, ...JSON_TYPE },
      body: JSON.stringify(meBody(state.current)),
    });
  });
};

/** Answers `POST /profile` (and its preflight) with `answer`; every request body is pushed to `bodies`, in order. */
export const answerProfile = async (
  page: Page,
  answer: ProfileResponder,
  bodies: unknown[],
): Promise<void> => {
  await page.route('**/api/v1/profile', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: NO_CONTENT, headers: API_CORS });

      return;
    }

    const body = route.request().postDataJSON() as unknown;

    bodies.push(body);
    const { status = STATUS_OK, body: reply, after } = answer(body);

    await after;
    await route.fulfill({
      status,
      headers: { ...API_CORS, ...JSON_TYPE },
      body: JSON.stringify(reply),
    });
  });
};

/** The error envelope of error-handling §1, with optional field `details`. */
export const refused = (
  status: number,
  code: string,
  details?: unknown,
): { status: number; body: unknown } => ({
  status,
  body: { error: { code, message: code, ...(details === undefined ? {} : { details }) } },
});
