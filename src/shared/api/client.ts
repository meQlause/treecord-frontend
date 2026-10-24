// docs/FE/fe-architecture.md §5: every request goes through here. Bearer token from the session, JSON in and out, the
// error envelope as a typed error, an abort limit (ui-gaps pattern 15) and one Idempotency-Key per user action (ADR-009).
import { ApiError, NETWORK, TIMEOUT, errorFromResponse } from './errors';

const DEFAULT_TIMEOUT_MS = 30_000;

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions = {
  method?: Method;
  /** Sent as JSON. */
  body?: unknown;
  /** Appended as `?a=1&b=2`; `undefined` values are left out. */
  query?: Readonly<Record<string, string | number | boolean | undefined>>;
  /** One per user action: generate it when the action starts and send the same key on every retry of it. */
  idempotencyKey?: string;
  /** The caller's own cancel (a screen leaving). Not a failure, so it is rethrown as the `AbortError` it is. */
  signal?: AbortSignal;
};

export type ClientConfig = {
  baseUrl: string;
  /** The Privy access token, asked per request and never kept (D-7). `null` sends no `Authorization`. */
  getToken: () => Promise<string | null>;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

/** A fresh key for one user action. */
export const idempotencyKey = (): string => crypto.randomUUID();

const urlFor = (baseUrl: string, path: string, query: RequestOptions['query']): string => {
  const params = new URLSearchParams();

  Object.entries(query ?? {}).forEach(([name, value]) => {
    if (value !== undefined) {
      params.set(name, String(value));
    }
  });
  const search = params.toString();

  return search === '' ? baseUrl + path : [baseUrl + path, search].join('?');
};

/** One signal that fires when the limit passes or the caller cancels; `timedOut` tells the two apart. */
const abortLimit = (timeoutMs: number, caller: AbortSignal | undefined) => {
  const controller = new AbortController();
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    controller.abort();
  }, timeoutMs);
  const cancel = (): void => controller.abort();

  if (caller?.aborted === true) {
    cancel();
  }

  caller?.addEventListener('abort', cancel);

  return {
    signal: controller.signal,
    timedOut: () => expired,
    clear: () => {
      clearTimeout(timer);
      caller?.removeEventListener('abort', cancel);
    },
  };
};

type Answer = { response: Response; body: unknown };

const readBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();

  try {
    return text === '' ? undefined : (JSON.parse(text) as unknown);
  } catch {
    return undefined;
  }
};

export const createClient = ({
  baseUrl,
  getToken,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetch: fetchImpl = (...args) => fetch(...args),
}: ClientConfig) => {
  const headersFor = async (options: RequestOptions): Promise<Headers> => {
    const token = await getToken();
    const headers = new Headers({ Accept: 'application/json' });

    if (token !== null) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    if (options.idempotencyKey !== undefined) {
      headers.set('Idempotency-Key', options.idempotencyKey);
    }

    return headers;
  };

  // the abort limit covers the whole answer, body included
  const send = async (path: string, options: RequestOptions): Promise<Answer> => {
    const limit = abortLimit(timeoutMs, options.signal);

    try {
      const response = await fetchImpl(urlFor(baseUrl, path, options.query), {
        method: options.method ?? 'GET',
        headers: await headersFor(options),
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        signal: limit.signal,
      });

      return { response, body: await readBody(response) };
    } catch (cause) {
      if (options.signal?.aborted === true) {
        throw cause;
      }

      const code = limit.timedOut() ? TIMEOUT : NETWORK;

      throw new ApiError({ code, message: code, status: 0 });
    } finally {
      limit.clear();
    }
  };

  return async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const { response, body } = await send(path, options);

    if (!response.ok) {
      throw errorFromResponse(response.status, body);
    }

    return body as T;
  };
};
