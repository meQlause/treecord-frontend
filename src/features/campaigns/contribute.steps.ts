// The steps of D04 (s04-campaign.md "Chain calls"), apart from the screen: approve exactly what the contract will take, check
// the chain again just before the send, send `contribute`, then wait for the receipt and for the page to show the result.
// Every step that cannot go on throws a `WalletAbortError`: nothing more is sent and the review waits for another press.
import type { Address, Hash } from 'viem';
import { campaignAbi, erc20Abi } from '../../shared/chain/abis';
import { outcomeOf, type Outcome } from '../../shared/chain/errors';
import { publicClientOf, sendWrite, settle, type ChainSession } from '../../shared/chain/wallet';
import { WalletAbortError } from '../../shared/ui/useWalletTx';
import {
  CHAIN_STATUS,
  readFacts,
  readWallet,
  type Facts,
  type WalletFigures,
} from './campaign.chain';
import { effectiveOf } from './campaign.rules';
import type { Viewer } from './campaigns.api';

const POLL_MS = 2000;
const POLL_TRIES = 60;

export type Review = { units: bigint; effective: bigint; wallet: WalletFigures };

/** The line above Confirm: the remaining moved, the USDC is short, or a step failed with this outcome. */
export type Notice =
  | { kind: 'changed' | 'closed' }
  | { kind: 'lowUsdc'; amount: string }
  | { kind: 'failed'; outcome: Outcome }
  | null;

export type Context = {
  session: (chainId: number) => Promise<ChainSession>;
  chainId: number;
  campaign: Address;
  account: Address;
  viewer: Viewer;
  review: Review | null;
  hash: { current: Hash | null };
  setReview: (review: Review | null) => void;
  setNotice: (notice: Notice) => void;
  setConfirmed: (units: bigint) => void;
  /** Re-reads the page; answers with the viewer it now holds. */
  reread: () => Promise<Viewer | null>;
  /** The campaign no longer takes contributions: the page refreshes and says why (D4-8). */
  onClosed: () => void;
};

const sleep = (millis: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, millis));

export const isOpen = (facts: Facts): boolean =>
  facts.status === CHAIN_STATUS.funding && facts.now < facts.deadline;

/** Shows what failed and sends the flow back to where the person can press again. */
const fail = (context: Context, error: unknown, back: 'approval' | 'confirm'): never => {
  if (error instanceof WalletAbortError) {
    throw error;
  }

  context.setNotice({ kind: 'failed', outcome: outcomeOf(error) });
  throw new WalletAbortError(back);
};

export const approve = async (context: Context): Promise<void> => {
  const { review } = context;

  if (review === null) {
    return;
  }

  try {
    const wallet = await context.session(context.chainId);

    context.setNotice(null);
    await settle(
      wallet,
      await sendWrite(wallet, {
        address: review.wallet.usdc,
        abi: erc20Abi,
        functionName: 'approve',
        args: [context.campaign, review.effective],
      }),
    );
    context.setReview({
      ...review,
      wallet: await readWallet(wallet.publicClient, context.campaign, context.account),
    });
  } catch (error) {
    fail(context, error, 'approval');
  }
};

/** The pre-send re-read (FR-044 #2): a closed campaign ends the review, a moved remainder updates it; neither sends. */
const recheck = async (context: Context, review: Review): Promise<void> => {
  const client = publicClientOf(context.chainId);
  const facts = client === null ? null : await readFacts(client, context.campaign);

  if (facts === null || !isOpen(facts)) {
    context.setReview(null);
    context.onClosed();
    throw new WalletAbortError('idle');
  }

  const effective = effectiveOf(review.units, facts.target, facts.raised);

  if (effective !== review.effective) {
    context.setReview({ ...review, effective });
    context.setNotice({ kind: 'changed' });
    throw new WalletAbortError(review.wallet.allowance < effective ? 'approval' : 'confirm');
  }
};

export const send = async (context: Context): Promise<void> => {
  const { review } = context;

  if (review === null) {
    return;
  }

  try {
    await recheck(context, review);

    const wallet = await context.session(context.chainId);

    context.setNotice(null);
    context.hash.current = await sendWrite(wallet, {
      address: context.campaign,
      abi: campaignAbi,
      functionName: 'contribute',
      args: [review.effective],
    });
  } catch (error) {
    fail(context, error, 'confirm');
  }
};

/** Asks the page until it shows the contribution (FR-046 #1); gives up quietly after about two minutes. */
const untilShown = async (context: Context, expected: bigint): Promise<void> => {
  for (let attempt = 0; attempt < POLL_TRIES; attempt += 1) {
    const fresh = await context.reread();

    if (fresh !== null && BigInt(fresh.contributedAmount) >= expected) {
      context.setConfirmed(BigInt(fresh.contributedAmount));

      return;
    }

    await sleep(POLL_MS);
  }
};

/** The receipt by hash, then the page's own figures. */
export const index = async (context: Context): Promise<void> => {
  const { review, hash } = context;

  if (review === null || hash.current === null) {
    return;
  }

  try {
    await settle(await context.session(context.chainId), hash.current);
    await untilShown(context, BigInt(context.viewer.contributedAmount) + review.effective);
  } catch (error) {
    fail(context, error, 'confirm');
  }
};
