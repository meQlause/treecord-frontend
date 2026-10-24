// What a wallet failure means to a person: found on the error itself or on one it wraps.
import { BaseError, InsufficientFundsError, UserRejectedRequestError } from 'viem';
import { describe, expect, it } from 'vitest';
import { RevertedError, WrongNetworkError, outcomeOf } from '../../../../src/shared/chain/errors';
import { WalletRejectedError } from '../../../../src/shared/ui/useWalletTx';

describe('outcomeOf', () => {
  it('names the kinds the screens tell apart', () => {
    expect(outcomeOf(new WalletRejectedError())).toBe('rejected');
    expect(outcomeOf(new WrongNetworkError())).toBe('wrongNetwork');
    expect(outcomeOf(new RevertedError())).toBe('reverted');
    expect(outcomeOf(new Error('boom'))).toBe('failed');
  });

  it('finds a viem kind under the error that wraps it', () => {
    const rejected = new UserRejectedRequestError(new BaseError('no'));
    const noGas = new InsufficientFundsError({ cause: new BaseError('funds') });

    expect(outcomeOf(rejected)).toBe('rejected');
    expect(outcomeOf(new BaseError('send failed', { cause: noGas }))).toBe('insufficientGas');
    expect(outcomeOf(new BaseError('send failed', { cause: new Error('other') }))).toBe('failed');
  });
});
