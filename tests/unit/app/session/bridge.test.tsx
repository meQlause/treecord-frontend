import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionBridge } from '../../../../src/app/session/bridge';
import { apiModule, newQueryClient, privyState, resetPrivy } from '../../session-mocks';

vi.mock('@privy-io/react-auth', async () => (await import('../../session-mocks')).privyModule);
vi.mock(
  '../../../../src/app/session/api',
  async () => (await import('../../session-mocks')).apiModule,
);

const account = (id: string) => ({ id, email: { address: `${id}@example.com` } });

describe('SessionBridge', () => {
  beforeEach(() => {
    resetPrivy();
    window.sessionStorage.clear();
  });

  it('hands Privy’s token getter to the API client', () => {
    const queryClient = newQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <SessionBridge />
      </QueryClientProvider>,
    );

    expect(apiModule.setTokenSource).toHaveBeenCalledWith(privyState.getAccessToken);
  });

  it('clears the previous account’s cache and drafts when the Privy user changes without a sign-out', () => {
    const queryClient = newQueryClient();
    const tree = () => (
      <QueryClientProvider client={queryClient}>
        <SessionBridge />
      </QueryClientProvider>
    );

    privyState.user = account('sari');
    const { rerender } = render(tree());

    queryClient.setQueryData(['sari', 'trees'], 1);
    window.sessionStorage.setItem('treecord:draft:sari:w:84532:profile', 'x');
    rerender(tree());

    expect(queryClient.getQueryData(['sari', 'trees'])).toBe(1);

    privyState.user = account('alex');
    rerender(tree());

    expect(queryClient.getQueryCache().getAll()).toEqual([]);
    expect(window.sessionStorage).toHaveLength(0);
  });
});
