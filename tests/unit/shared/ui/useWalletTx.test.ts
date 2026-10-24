import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  WalletAbortError,
  WalletRejectedError,
  useWalletTx,
  type TxSteps,
} from '../../../../src/shared/ui/useWalletTx';

const deferred = () => {
  let resolve: () => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const setup = (steps: TxSteps) => renderHook(() => useWalletTx(steps));

describe('useWalletTx', () => {
  it('starts idle with nothing in flight', () => {
    const { result } = setup({ send: () => Promise.resolve() });

    expect(result.current).toMatchObject({ state: 'idle', busy: false, active: false });
  });

  it('single step: start -> confirm -> confirming -> indexing -> done', async () => {
    const send = deferred();
    const index = deferred();
    const { result } = setup({ send: () => send.promise, index: () => index.promise });

    act(() => result.current.start());
    expect(result.current).toMatchObject({ state: 'confirm', busy: false, active: true });

    await act(async () => {
      void result.current.confirm();
    });
    expect(result.current).toMatchObject({ state: 'confirming', busy: true });

    await act(async () => send.resolve());
    expect(result.current).toMatchObject({ state: 'indexing', busy: true });

    await act(async () => index.resolve());
    expect(result.current).toMatchObject({ state: 'done', busy: false, active: false });
  });

  it('with an allowance: start -> approval -> approving -> confirm -> confirming -> done', async () => {
    const approve = vi.fn(() => Promise.resolve());
    const send = vi.fn(() => Promise.resolve());
    const { result } = setup({ approve, send });

    act(() => result.current.start());
    expect(result.current.state).toBe('approval');

    await act(() => result.current.approve());
    expect(approve).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('confirm');

    await act(() => result.current.confirm());
    expect(send).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('done');
  });

  it('goes straight from confirming to done when there is nothing to index', async () => {
    const { result } = setup({ send: () => Promise.resolve() });

    act(() => result.current.start());
    await act(() => result.current.confirm());
    expect(result.current.state).toBe('done');
  });
});

describe('useWalletTx failure and guards', () => {
  it('a wallet rejection ends in rejected, any other error in failed; both can start again', async () => {
    let error: unknown = new WalletRejectedError('no');
    const { result } = setup({ send: () => Promise.reject(error) });

    act(() => result.current.start());
    await act(() => result.current.confirm());
    expect(result.current.state).toBe('rejected');

    error = new Error('reverted');
    act(() => result.current.start());
    expect(result.current.state).toBe('confirm');
    await act(() => result.current.confirm());
    expect(result.current.state).toBe('failed');
    expect(result.current.active).toBe(false);
  });

  it('a failing allowance stops before the transaction', async () => {
    const send = vi.fn(() => Promise.resolve());
    const { result } = setup({ approve: () => Promise.reject(new Error('x')), send });

    act(() => result.current.start());
    await act(() => result.current.approve());
    expect(result.current.state).toBe('failed');
    expect(send).not.toHaveBeenCalled();
  });

  it('reject() declines while waiting for the click, not while a step runs', async () => {
    const send = deferred();
    const { result } = setup({ send: () => send.promise });

    act(() => result.current.start());
    act(() => result.current.reject());
    expect(result.current.state).toBe('rejected');

    act(() => result.current.start());
    await act(async () => {
      void result.current.confirm();
    });
    act(() => result.current.reject());
    expect(result.current.state).toBe('confirming');
  });

  it('keeps one transaction in flight: a second confirm is ignored and reset waits', async () => {
    const send = deferred();
    const sendStep = vi.fn(() => send.promise);
    const { result } = setup({ send: sendStep });

    act(() => result.current.start());
    await act(async () => {
      void result.current.confirm();
      void result.current.confirm();
    });
    act(() => result.current.reset());
    expect(sendStep).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('confirming');

    await act(async () => send.resolve());
    act(() => result.current.reset());
    expect(result.current.state).toBe('idle');
  });

  it('ignores approve and confirm outside their own state', async () => {
    const send = vi.fn(() => Promise.resolve());
    const { result } = setup({ approve: () => Promise.resolve(), send });

    await act(() => result.current.confirm());
    await act(() => result.current.approve());
    expect(result.current.state).toBe('idle');
    expect(send).not.toHaveBeenCalled();
  });

  it('does not start again while a transaction is open', () => {
    const { result } = setup({ approve: () => Promise.resolve(), send: () => Promise.resolve() });

    act(() => result.current.start());
    act(() => result.current.reject());
    act(() => result.current.start());
    expect(result.current.state).toBe('approval');
    act(() => result.current.start());
    expect(result.current.state).toBe('approval');
  });

  it('a step that finds the review out of date sends nothing and returns to the state it names', async () => {
    const { result } = setup({
      send: () => Promise.reject(new WalletAbortError('confirm')),
      index: () => Promise.resolve(),
    });

    act(() => result.current.start());
    await act(() => result.current.confirm());
    expect(result.current).toMatchObject({ state: 'confirm', busy: false, active: true });
  });
});
