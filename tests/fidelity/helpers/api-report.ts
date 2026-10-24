// Answers the app's own API for the S05 and S06 flow specs (the backend does not run; the criteria say the answers are
// the contract examples). One route on the API origin, the CORS preflight included; Privy's own /api/v1/ is untouched.
import type { Page, Request, Route } from '@playwright/test';

const ORIGIN = 'http://127.0.0.1:5173';
const NO_CONTENT = 204;
const NOT_FOUND = 404;
const CORS = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Headers': 'authorization,content-type,idempotency-key',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Expose-Headers': 'X-Request-Id',
};

/** Our API (VITE_API_URL), not Privy's. */
const OWN_API = /localhost:4000\/api\/v1\//;

type Reply = {
  status?: number;
  body: unknown;
  /** A request is held until this settles. */
  after?: Promise<unknown>;
};

/** What a request gets: a `Reply`, or `undefined` for the 404 envelope. */
export type Answer = (url: URL, request: Request) => Reply | undefined;

export const errorBody = (code: string, message = code) => ({ error: { code, message } });

/** The calls the page made to our API, e.g. `GET /api/v1/trees/3001`, in order (preflights are not calls). */
export type Calls = { all: () => string[]; to: (pattern: RegExp) => Request[] };

export const stubApi = async (page: Page, answer: Answer): Promise<Calls> => {
  const seen: Request[] = [];

  await page.route(OWN_API, async (route: Route) => {
    const request = route.request();

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: NO_CONTENT, headers: CORS });

      return;
    }

    seen.push(request);
    const reply = answer(new URL(request.url()), request) ?? {
      status: NOT_FOUND,
      body: errorBody('not_found'),
    };

    await reply.after;
    await route.fulfill({
      status: reply.status ?? 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify(reply.body),
    });
  });

  return {
    all: () => seen.map((request) => `${request.method()} ${new URL(request.url()).pathname}`),
    to: (pattern) => seen.filter((request) => pattern.test(request.url())),
  };
};
