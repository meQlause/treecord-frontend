// What a wallet or chain failure means to a person (s04-campaign.md §5 "Wallet outcomes"): the transaction stays unsent and
// the inputs stay. viem's errors carry their own kind, found by walking the cause chain.
import { BaseError, InsufficientFundsError, UserRejectedRequestError } from 'viem';
import { WalletRejectedError } from '../ui/useWalletTx';

export type Outcome = 'rejected' | 'reverted' | 'insufficientGas' | 'wrongNetwork' | 'failed';

/** Thrown when the wallet could not be put on the campaign's chain. */
export class WrongNetworkError extends Error {}

/** Thrown when the receipt says the transaction reverted. */
export class RevertedError extends Error {}

const kindOf = (error: unknown): Outcome => {
  if (error instanceof WalletRejectedError || error instanceof UserRejectedRequestError) {
    return 'rejected';
  }

  if (error instanceof WrongNetworkError) {
    return 'wrongNetwork';
  }

  if (error instanceof RevertedError) {
    return 'reverted';
  }

  return error instanceof InsufficientFundsError ? 'insufficientGas' : 'failed';
};

/** The outcome of a failed step; a viem error is looked at, then the errors it wraps. */
export const outcomeOf = (error: unknown): Outcome => {
  const direct = kindOf(error);

  if (direct !== 'failed' || !(error instanceof BaseError)) {
    return direct;
  }

  const inner = error.walk((cause) => kindOf(cause) !== 'failed');

  return inner === null ? 'failed' : kindOf(inner);
};
