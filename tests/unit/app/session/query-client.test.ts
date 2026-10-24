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
  it.each(['service_unavailable', 'network', 'not_found', 'invalid_token', 'campaign_not_active'])(
    'never retries a failed %s read by itself: one request per user action',
    async (code) => {
      expect(await run(createQueryClient(vi.fn()), fail(code))).toBe(1);
    },
  );

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
