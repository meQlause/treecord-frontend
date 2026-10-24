import { describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '../../../../src/app/session/query-client';
import { ApiError } from '../../../../src/shared/api/errors';

const fail = (code: string, status = 500) => new ApiError({ code, message: code, status });

const run = async (client: ReturnType<typeof createQueryClient>, error: unknown) => {
  let calls = 0;

  await client
    .fetchQuery({
      queryKey: ['private'],
      queryFn: () => {
        calls += 1;

        return Promise.reject(error);
      },
      retryDelay: 0,
    })
    .catch(() => undefined);

  return calls;
};

describe('createQueryClient', () => {
  it('retries a retry-class failure once, and nothing else', async () => {
    const client = createQueryClient(vi.fn());
    const retry = client.getDefaultOptions().queries?.retry as (n: number, e: unknown) => boolean;

    expect(retry(1, fail('service_unavailable', 503))).toBe(true);
    expect(retry(2, fail('service_unavailable', 503))).toBe(false);
    expect(retry(1, fail('network', 0))).toBe(true);
    expect(retry(1, fail('not_found', 404))).toBe(false);
    expect(retry(1, fail('forbidden_role', 403))).toBe(false);
    expect(retry(1, fail('invalid_token', 401))).toBe(false);
    expect(retry(1, fail('campaign_not_active', 409))).toBe(false);
    expect(retry(1, new Error('bug'))).toBe(false);
  });

  it('does not repeat a refused token, and reports it once per failure', async () => {
    const expired = vi.fn();
    const calls = await run(createQueryClient(expired), fail('invalid_token', 401));

    expect(calls).toBe(1);
    expect(expired).toHaveBeenCalledOnce();
  });

  it('reports a refused token from a mutation too, never retrying it', async () => {
    const expired = vi.fn();
    const client = createQueryClient(expired);
    const send = vi.fn(() => Promise.reject(fail('missing_token', 401)));

    await client
      .getMutationCache()
      .build(client, { mutationFn: send })
      .execute(undefined)
      .catch(() => undefined);

    expect(send).toHaveBeenCalledOnce();
    expect(expired).toHaveBeenCalledOnce();
  });

  it.each(['service_unavailable', 'not_found', 'forbidden_role', 'wallet_already_linked'])(
    'does not treat %s as an expired session',
    async (code) => {
      const expired = vi.fn();

      await run(createQueryClient(expired), fail(code));

      expect(expired).not.toHaveBeenCalled();
    },
  );

  it('does not poll in a hidden tab', () => {
    expect(
      createQueryClient(vi.fn()).getDefaultOptions().queries?.refetchIntervalInBackground,
    ).toBe(false);
  });
});
