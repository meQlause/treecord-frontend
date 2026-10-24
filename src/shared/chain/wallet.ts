// viem over the person's wallet (fe-architecture §2 `shared/chain`): the Privy embedded wallet in the app, a local test
// account only in the browser specs. Clients are made at action time, on the campaign's chain: before any write the wallet
// is put on that chain, and a write is never retried by itself (fe-architecture §5).
import { useWallets } from '@privy-io/react-auth';
import { useCallback } from 'react';
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Abi,
  type Address,
  type Hash,
  type Hex,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { chainOf, rpcOf } from './chains';
import { RevertedError, WrongNetworkError } from './errors';

export type ChainSession = {
  account: Address;
  publicClient: PublicClient;
  walletClient: WalletClient;
};

type Seam = { privateKey: Hex };

/**
 * The browser specs' wallet: a funded anvil account set by the spec as `window.treecordE2E`. It exists only in the dev
 * server (`import.meta.env.DEV`), so a production build has no such branch, and only on the local chain.
 */
const seamOf = (chainId: number): Seam | null => {
  if (!import.meta.env.DEV || chainId !== LOCAL_CHAIN) {
    return null;
  }

  return (window as { treecordE2E?: Seam }).treecordE2E ?? null;
};

const LOCAL_CHAIN = 31_337;
const RECEIPT_POLL_MS = 1000;
const RECEIPT_WAIT_MS = 600_000;

/** `session(chainId)` is the wallet's clients on that chain; it throws `WrongNetworkError` when the chain cannot be reached. */
export function useChainSession(): (chainId: number) => Promise<ChainSession> {
  const { wallets } = useWallets();

  return useCallback(
    async (chainId: number): Promise<ChainSession> => {
      const chain = chainOf(chainId);

      if (chain === null) {
        throw new WrongNetworkError(`chain ${chainId}`);
      }

      const publicClient = createPublicClient({ chain, transport: http(rpcOf(chain)) });
      const seam = seamOf(chainId);

      if (seam !== null) {
        const account = privateKeyToAccount(seam.privateKey);

        return {
          account: account.address,
          publicClient,
          walletClient: createWalletClient({ account, chain, transport: http(rpcOf(chain)) }),
        };
      }

      const wallet =
        wallets.find(({ walletClientType }) => walletClientType === 'privy') ?? wallets[0];

      if (wallet === undefined) {
        throw new WrongNetworkError('no wallet');
      }

      await wallet.switchChain(chainId).catch(() => {
        throw new WrongNetworkError(`switch to ${chainId}`);
      });

      return {
        account: wallet.address as Address,
        publicClient,
        walletClient: createWalletClient({
          account: wallet.address as Address,
          chain,
          transport: custom(await wallet.getEthereumProvider()),
        }),
      };
    },
    [wallets],
  );
}

type Call = { address: Address; abi: Abi; functionName: string; args?: readonly unknown[] };

/** Sends one write and resolves with its hash once the wallet has signed and broadcast it. */
export const sendWrite = (session: ChainSession, call: Call): Promise<Hash> =>
  session.walletClient.writeContract({
    ...call,
    // a local account signs here; the Privy wallet's own account is a JSON-RPC one the provider signs for
    account: session.walletClient.account ?? session.account,
    chain: session.walletClient.chain ?? null,
  });

/** Waits for the receipt by hash, as long as it takes (a slow chain is never a failure); a revert throws `RevertedError`. */
export const settle = async (session: ChainSession, hash: Hash): Promise<void> => {
  const receipt = await session.publicClient.waitForTransactionReceipt({
    hash,
    pollingInterval: RECEIPT_POLL_MS,
    timeout: RECEIPT_WAIT_MS,
  });

  if (receipt.status !== 'success') {
    throw new RevertedError(hash);
  }
};

/** Reads need no wallet: a public client on the campaign's chain, or `null` for a chain the app does not know. */
export const publicClientOf = (chainId: number): PublicClient | null => {
  const chain = chainOf(chainId);

  return chain === null ? null : createPublicClient({ chain, transport: http(rpcOf(chain)) });
};
