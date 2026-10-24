import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClient, idempotencyKey } from '../../../../src/shared/api/client';
import { ApiError } from '../../../../src/shared/api/errors';

const BASE = 'http://api.test/api/v1';
const THIRTY_SECONDS = 30_000;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const clientWith = (answer: () => Response | Promise<Response>, token: string | null = 'tok') => {
  const fetchStub = vi.fn((_url: string, _init: RequestInit) => Promise.resolve(answer()));
  const request = createClient({
    baseUrl: BASE,
    getToken: () => Promise.resolve(token),
    fetch: fetchStub as unknown as typeof fetch,
  });

  return { request, fetchStub };
};

const sentInit = (stub: ReturnType<typeof clientWith>['fetchStub']): RequestInit =>
  stub.mock.calls[0]?.[1] as RequestInit;

afterEach(() => {
  vi.useRealTimers();
});

describe('createClient', () => {
  it('sends the bearer token and returns the parsed body', async () => {
    const { request, fetchStub } = clientWith(() => json({ id: 7 }));

    await expect(request('/me')).resolves.toEqual({ id: 7 });
    expect(fetchStub.mock.calls[0]?.[0]).toBe(`${BASE}/me`);
    expect(new Headers(sentInit(fetchStub).headers).get('Authorization')).toBe('Bearer tok');
    expect(sentInit(fetchStub).method).toBe('GET');
  });

  it('sends no Authorization when there is no session', async () => {
    const { request, fetchStub } = clientWith(() => json({}), null);

    await request('/campaigns');

    expect(new Headers(sentInit(fetchStub).headers).has('Authorization')).toBe(false);
  });

  it('asks for the token on every request and keeps none', async () => {
    const getToken = vi.fn(() => Promise.resolve('fresh'));
    const request = createClient({
      baseUrl: BASE,
      getToken,
      fetch: (() => Promise.resolve(json({}))) as unknown as typeof fetch,
    });

    await request('/a');
    await request('/b');

    expect(getToken).toHaveBeenCalledTimes(2);
  });

  it('sends a JSON body with its content type, and the query without undefined values', async () => {
    const { request, fetchStub } = clientWith(() => json({}));

    await request('/campaigns', {
      method: 'POST',
      body: { title: 'Demak' },
      query: { limit: 20, status: undefined, open: true },
    });

    const init = sentInit(fetchStub);

    expect(fetchStub.mock.calls[0]?.[0]).toBe(`${BASE}/campaigns?limit=20&open=true`);
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"title":"Demak"}');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });

  it('sends the Idempotency-Key it is given, the same on a retry of the same action', async () => {
    const { request, fetchStub } = clientWith(() => json({}));
    const key = idempotencyKey();

    await request('/campaigns/0xabc/claim', { method: 'POST', idempotencyKey: key });
    await request('/campaigns/0xabc/claim', { method: 'POST', idempotencyKey: key });

    const keys = fetchStub.mock.calls.map(([, init]) =>
      new Headers(init.headers).get('Idempotency-Key'),
    );

    expect(keys).toEqual([key, key]);
  });

  it('answers undefined for 204', async () => {
    const { request } = clientWith(() => new Response(null, { status: 204 }));

    await expect(request('/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});

describe('createClient errors and limits', () => {
  it('turns the error envelope into a typed error', async () => {
    const { request } = clientWith(() =>
      json(
        {
          error: {
            code: 'planter_cap_exceeded',
            message: 'You can claim at most 1 more slots in this campaign',
            details: { remaining: 1, cap: 3 },
            requestId: '01JB7Q6V0Z3K8R2M5N9P4T6W1X',
          },
        },
        422,
      ),
    );
    const error = (await request('/claim').catch((caught: unknown) => caught)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'planter_cap_exceeded',
      status: 422,
      details: { remaining: 1, cap: 3 },
      requestId: '01JB7Q6V0Z3K8R2M5N9P4T6W1X',
    });
    expect(error.class).toBe('field');
  });

  it('answers internal_error for an error body that is not the envelope', async () => {
    const { request } = clientWith(() => new Response('<html>bad gateway</html>', { status: 502 }));
    const error = (await request('/x').catch((caught: unknown) => caught)) as ApiError;

    expect(error).toMatchObject({ code: 'internal_error', status: 502 });
    expect(error.class).toBe('retry');
  });

  it('treats a request that never reaches the server as a network failure', async () => {
    const request = createClient({
      baseUrl: BASE,
      getToken: () => Promise.resolve(null),
      fetch: (() => Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch,
    });
    const error = (await request('/x').catch((caught: unknown) => caught)) as ApiError;

    expect(error).toMatchObject({ code: 'network', status: 0 });
    expect(error.class).toBe('retry');
  });

  it('aborts after 30 seconds and answers the timeout state', async () => {
    vi.useFakeTimers();
    let aborted = false;
    const hang = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          aborted = true;
          reject(new DOMException('aborted', 'AbortError'));
        });
      })) as unknown as typeof fetch;
    const request = createClient({
      baseUrl: BASE,
      getToken: () => Promise.resolve(null),
      fetch: hang,
    });
    const outcome = request('/slow').catch((caught: unknown) => caught);

    await vi.advanceTimersByTimeAsync(THIRTY_SECONDS - 1);
    expect(aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    const error = (await outcome) as ApiError;

    expect(aborted).toBe(true);
    expect(error).toMatchObject({ code: 'timeout', status: 0 });
    expect(error.class).toBe('retry');
  });

  it('lets a screen cancel its own request without calling it a failure', async () => {
    const cancel = new AbortController();
    const hang = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        const fail = (): void => reject(new DOMException('aborted', 'AbortError'));

        // like the real fetch, a signal that already fired rejects at once
        if (init.signal?.aborted === true) {
          fail();
        }

        init.signal?.addEventListener('abort', fail);
      })) as unknown as typeof fetch;
    const request = createClient({
      baseUrl: BASE,
      getToken: () => Promise.resolve(null),
      fetch: hang,
    });
    // the screen leaves while the token is still being asked for
    const outcome = request('/x', { signal: cancel.signal }).catch((caught: unknown) => caught);

    await Promise.resolve();
    cancel.abort();

    expect(await outcome).toMatchObject({ name: 'AbortError' });
  });
});

describe('idempotencyKey', () => {
  it('is a fresh server-acceptable key each time: 1-200 visible ASCII, no reserved prefix', () => {
    const first = idempotencyKey();

    expect(first).not.toBe(idempotencyKey());
    expect(first).toMatch(/^[\x21-\x7e]{1,200}$/);
    expect(first).not.toMatch(/^(score|attestation|resolve_flag):/);
  });
});
