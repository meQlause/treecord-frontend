// The S02 harness (docs/FE/features/s02-sign-in.md §7): a Privy test account whose one-time code is fixed, kept in
// backend/.env, and Playwright answering GET /api/v1/me. Secrets stay in that file; nothing here prints them.
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

/**
 * Privy's own hosts, allowed for the specs that sign in (fidelity.md §2 Network). walletconnect.com is asked by the SDK
 * only because the Privy dashboard still allows wallet login (D-7); turning that off there removes the request.
 */
export const PRIVY_HOSTS = ['.privy.io', '.walletconnect.com'];

const API = '**/api/v1/me';
const CORS = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
  'Access-Control-Allow-Headers': 'authorization,content-type,idempotency-key',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Expose-Headers': 'X-Request-Id',
};

const backendEnv = (): Record<string, string> =>
  Object.fromEntries(
    readFileSync('../backend/.env', 'utf8')
      .split(/\r?\n/)
      .map((line) => /^([A-Z0-9_]+)=(.*)$/.exec(line))
      .filter((match): match is RegExpExecArray => match !== null)
      .map(([, name, value]) => [name, value ?? '']),
  );

export const testLogin = (): { email: string; code: string } => {
  const env = backendEnv();

  return { email: env.PRIVY_TEST_EMAIL ?? '', code: env.PRIVY_TEST_OTP ?? '' };
};

/** Answers `GET /me` with `body` (a status and JSON), and the CORS preflight the browser sends first. */
export const answerMe = async (page: Page, body: unknown, status = 200): Promise<void> => {
  await page.route(API, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });

      return;
    }

    await route.fulfill({
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  });
};
