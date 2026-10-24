import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { SESSION_EXPIRED, expireSession } from '../../../../src/app/session/expire';

const routerAt = (pathname: string, search = '', navigation = 'idle') => ({
  state: { location: { pathname, search }, navigation: { state: navigation } },
  navigate: vi.fn(() => Promise.resolve()),
});

const seeded = () => {
  const client = new QueryClient();

  client.setQueryData(['me', 'did:privy:sari', 84532], 1);
  client.setQueryData(['bfb15801', '0x4b9e', 84532, 'trees'], 2);
  client.setQueryData(['public', 'campaigns'], 3);

  return client;
};

describe('expireSession (SH-15)', () => {
  it('drops the private caches, keeps public reads, and replaces to S02 with the page and the reason', () => {
    const client = seeded();
    const router = routerAt('/app/planter/trees', '?tab=alive');

    expireSession(client, router as never);

    expect(
      client
        .getQueryCache()
        .getAll()
        .map((query) => query.queryKey),
    ).toEqual([['public', 'campaigns']]);
    expect(router.navigate).toHaveBeenCalledWith(
      '/sign-in?returnTo=%2Fapp%2Fplanter%2Ftrees%3Ftab%3Dalive',
      { replace: true, state: { reason: SESSION_EXPIRED } },
    );
  });

  it('keeps the read that failed, so the mounted shell does not ask again (SH-AC14)', async () => {
    const client = seeded();
    const router = routerAt('/app/planter/trees');

    await client
      .fetchQuery({
        queryKey: ['me', 'did:privy:alex', 84532],
        queryFn: () => Promise.reject(new Error('401')),
      })
      .catch(() => undefined);
    expireSession(client, router as never);

    expect(
      client.getQueryCache().find({ queryKey: ['me', 'did:privy:alex', 84532] }),
    ).toBeDefined();
    expect(client.getQueryData(['me', 'did:privy:sari', 84532])).toBeUndefined();
  });

  it('does nothing on S02 itself, or while a navigation is already under way', () => {
    const client = seeded();
    const onSignIn = routerAt('/sign-in');
    const busy = routerAt('/app/profile', '', 'loading');

    expireSession(client, onSignIn as never);
    expireSession(client, busy as never);

    expect(onSignIn.navigate).not.toHaveBeenCalled();
    expect(busy.navigate).not.toHaveBeenCalled();
    expect(client.getQueryCache().getAll()).toHaveLength(3);
  });
});
