// Our own API, answered by the spec: `page.route` on the API origin (the real backend does not run, fidelity.md §2).
// A responder sees each request and returns the status and body; the CORS preflight is answered here, so a responder
// only ever sees real calls. The returned list holds every call in order.
import type { Page, Route } from '@playwright/test';

export type ApiCall = {
  method: string;
  /** Under `/api/v1`, e.g. `/campaigns`. */
  path: string;
  params: URLSearchParams;
  headers: Record<string, string>;
  body: unknown;
};

export type ApiAnswer = { status?: number; body?: unknown };

export type Responder = (call: ApiCall) => ApiAnswer | Promise<ApiAnswer>;

// our API (VITE_API_URL), not Privy's, which has an /api/v1/ of its own
const API = /^http:\/\/(localhost|127\.0\.0\.1):4000\/api\/v1\//;
const NO_CONTENT = 204;
const STATUS_OK = 200;
const CORS_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';

const corsHeaders = (route: Route): Record<string, string> => {
  const headers = route.request().headers();

  return {
    'Access-Control-Allow-Origin': headers.origin ?? '*',
    'Access-Control-Allow-Headers': headers['access-control-request-headers'] ?? '*',
    'Access-Control-Allow-Methods': CORS_METHODS,
    'Access-Control-Expose-Headers': 'X-Request-Id',
  };
};

const callOf = (route: Route): ApiCall => {
  const request = route.request();
  const url = new URL(request.url());

  return {
    method: request.method(),
    path: url.pathname.replace('/api/v1', ''),
    params: url.searchParams,
    headers: request.headers(),
    body: request.postData() === null ? undefined : (request.postDataJSON() as unknown),
  };
};

/** Answers every call to the API with `responder`; returns the calls it saw, in order. */
export const answerApi = async (page: Page, responder: Responder): Promise<ApiCall[]> => {
  const calls: ApiCall[] = [];

  await page.route(API, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: NO_CONTENT, headers: corsHeaders(route) });

      return;
    }

    const call = callOf(route);

    calls.push(call);
    const { status = STATUS_OK, body } = await responder(call);

    await route.fulfill({
      status,
      headers: { ...corsHeaders(route), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  });

  return calls;
};

/** The error envelope of error-handling §1. */
export const failure = (status: number, code: string): ApiAnswer => ({
  status,
  body: { error: { code, message: code } },
});
