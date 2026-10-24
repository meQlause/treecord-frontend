import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock(
  '../../../../src/app/session/config',
  async () => (await import('../../session-mocks')).configModule,
);

describe('api', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks the bridged getter for the token on every request and keeps none', async () => {
    const { api, setTokenSource } = await import('../../../../src/app/session/api');
    const fetchFake = vi.fn((_url: string, _init: RequestInit) =>
      Promise.resolve(new Response('{"ok":true}', { status: 200 })),
    );
    const getter = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');

    vi.stubGlobal('fetch', fetchFake);
    setTokenSource(getter);

    await expect(api('/me')).resolves.toEqual({ ok: true });
    await api('/me');

    const headers = fetchFake.mock.calls.map(
      ([, init]) => (init as RequestInit).headers as Headers,
    );

    expect(headers.map((sent) => sent.get('Authorization'))).toEqual([
      'Bearer first',
      'Bearer second',
    ]);
    expect(String(fetchFake.mock.calls[0]?.[0])).toBe('/api/v1/me');
    expect(JSON.stringify(Object.entries(window.localStorage))).not.toContain('first');
  });

  it('sends no Authorization before the bridge is mounted', async () => {
    const { api, setTokenSource } = await import('../../../../src/app/session/api');
    const fetchFake = vi.fn((_url: string, _init: RequestInit) =>
      Promise.resolve(new Response('{}', { status: 200 })),
    );

    vi.stubGlobal('fetch', fetchFake);
    setTokenSource(() => Promise.resolve(null));
    await api('/me');

    expect(
      ((fetchFake.mock.calls[0]?.[1] as RequestInit).headers as Headers).has('Authorization'),
    ).toBe(false);
  });

  it('publicApi never sends an Authorization, whatever token the bridge holds', async () => {
    const { publicApi, setTokenSource } = await import('../../../../src/app/session/api');
    const fetchFake = vi.fn((_url: string, _init: RequestInit) =>
      Promise.resolve(new Response('{}', { status: 200 })),
    );

    vi.stubGlobal('fetch', fetchFake);
    setTokenSource(() => Promise.resolve('secret'));
    await publicApi('/carbon/batches');

    expect(
      ((fetchFake.mock.calls[0]?.[1] as RequestInit).headers as Headers).has('Authorization'),
    ).toBe(false);
  });
});
