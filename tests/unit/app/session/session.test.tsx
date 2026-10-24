import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '../../../../src/app/session/session';
import { ApiError } from '../../../../src/shared/api/errors';
import {
  FIRST_SIGN_IN,
  SARI,
  apiMock,
  newQueryClient,
  privyState,
  resetPrivy,
  signedInAs,
} from '../../session-mocks';

vi.mock('@privy-io/react-auth', async () => (await import('../../session-mocks')).privyModule);
vi.mock(
  '../../../../src/app/session/api',
  async () => (await import('../../session-mocks')).apiModule,
);
vi.mock(
  '../../../../src/app/session/config',
  async () => (await import('../../session-mocks')).configModule,
);

const setup = () => {
  const queryClient = newQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, ...renderHook(() => useSession(), { wrapper }) };
};

const refuse = (code: string, status: number) =>
  apiMock.mockRejectedValue(new ApiError({ code, message: code, status }));

describe('useSession', () => {
  beforeEach(() => {
    resetPrivy();
    apiMock.mockReset();
    window.sessionStorage.clear();
  });

  it('is resolving until Privy is ready, and sends no request', () => {
    privyState.ready = false;
    const { result } = setup();

    expect(result.current.phase).toBe('resolving');
    expect(apiMock).not.toHaveBeenCalled();
  });

  it('is signed out without a Privy session, and sends no request', () => {
    const { result } = setup();

    expect(result.current.phase).toBe('signed-out');
    expect(apiMock).not.toHaveBeenCalled();
  });

  it('waits for GET /me, then is ready with the profile and the Privy email', async () => {
    apiMock.mockResolvedValue({ profile: SARI });
    signedInAs('sari@example.com');
    const { result } = setup();

    expect(result.current.phase).toBe('resolving');

    await waitFor(() => expect(result.current.phase).toBe('ready'));

    expect(result.current).toMatchObject({
      phase: 'ready',
      profile: {
        id: SARI.id,
        role: 'planter',
        displayName: 'Sari',
        walletAddress: SARI.walletAddress,
        email: 'sari@example.com',
        isBuyer: false,
        carbonRightsAgreementAccepted: true,
      },
    });
    expect(apiMock).toHaveBeenCalledWith('/me', expect.anything());
  });

  it('SI-13: a profile with no wallet yet is wallet-pending, not ready, so the workspace stays closed', async () => {
    apiMock.mockResolvedValue({ profile: FIRST_SIGN_IN });
    signedInAs();
    const { result } = setup();

    await waitFor(() => expect(result.current.phase).toBe('wallet-pending'));

    expect(result.current).not.toHaveProperty('profile');
  });

  it.each([
    ['wallet_already_linked', 409, false],
    ['invalid_token', 401, true],
    ['missing_token', 401, true],
  ])('treats a %s answer as signed out (SH-15, SH-16)', async (code, status, expired) => {
    refuse(code, status);
    signedInAs();
    const { result } = setup();

    await waitFor(() => expect(result.current.phase).toBe('signed-out'));
    expect(result.current).toMatchObject({ expired });
  });

  it('a visitor who never signed in is signed out, but not expired', () => {
    const { result } = setup();

    expect(result.current).toMatchObject({ phase: 'signed-out', expired: false });
  });

  it('is an error when /me fails with a server error', async () => {
    refuse('service_unavailable', 503);
    signedInAs();
    const { result } = setup();

    await waitFor(() => expect(result.current.phase).toBe('error'));
  });

  it('signs out: Privy logout, the query cache emptied, every draft removed and nothing else', async () => {
    apiMock.mockResolvedValue({ profile: SARI });
    signedInAs();
    window.sessionStorage.setItem('treecord:draft:p:w:84532:profile', '{"name":"Alex"}');
    window.sessionStorage.setItem('other', 'kept');
    const { result, queryClient } = setup();

    await waitFor(() => expect(result.current.phase).toBe('ready'));
    await result.current.signOut();

    expect(privyState.logout).toHaveBeenCalledOnce();
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
    expect(window.sessionStorage.getItem('treecord:draft:p:w:84532:profile')).toBeNull();
    expect(window.sessionStorage.getItem('other')).toBe('kept');
  });
});
