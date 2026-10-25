// What the S15 wallet specs stage on the local anvil beyond helpers/chain.ts: a reservation the donor can decline, and issued
// credits the donor can retire, plus a read of both. The app's D09 and D10 then send `declineReservation` and `retire`.
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { DONOR, DONOR_KEY, OPERATOR_KEY, type Chain } from './chain';

const RPC = 'http://127.0.0.1:8545';
const USDC = 1_000_000n;

const ledgerAbi = parseAbi([
  'function setEstimate(address campaign, uint256 estimatedAmount)',
  'function issueBatch(address campaign, string registry, string serialStart, string serialEnd, uint16 vintage, uint256 amount) returns (uint256)',
  'function reservationOf(address campaign, address holder) view returns (uint256)',
  'function allocatedOf(address campaign, address holder) view returns (uint256)',
  'function declined(address campaign, address holder) view returns (bool)',
  'function buy(uint256 batchId, uint256 amount) returns (uint256)',
  'function retire(uint256 batchId, uint256 amount, string beneficiary, string purpose) returns (uint256)',
  'function retirementCount() view returns (uint256)',
]);

type Reservation = { reserved: bigint; allocated: bigint; declined: boolean };

const publicClient = createPublicClient({
  chain: foundry,
  transport: http(RPC),
  pollingInterval: 250,
});

const walletOf = (key: Hex) =>
  createWalletClient({ account: privateKeyToAccount(key), chain: foundry, transport: http(RPC) });

type Write = { address: Address; functionName: string; args: readonly unknown[] };

const send = async (key: Hex, { address, functionName, args }: Write): Promise<void> => {
  const hash = await walletOf(key).writeContract({
    address,
    abi: ledgerAbi,
    functionName,
    args,
  } as never);

  await publicClient.waitForTransactionReceipt({ hash });
};

export type CarbonChain = {
  /**
   * A funded campaign where the donor reserved 2.000 tCO₂e (5.000 estimated, the donor 400 of 1,000 USDC) and a batch of
   * 4.000 was issued: 1.600 allocated to the donor, 0.400 unfilled.
   */
  reserve: () => Promise<Address>;
  reservation: (campaign: Address) => Promise<Reservation>;
  /** Batch 101's stand-in: the donor holds 2.600, retires 0.200 twice (retirements 1 and 2) and keeps 2.200. */
  hold: () => Promise<{ batchId: string; campaign: Address }>;
  retirementCount: () => Promise<bigint>;
};

export const carbonChain = (chain: Chain): CarbonChain => {
  const ledger = chain.ledger;
  const ask = <T>(functionName: string, args: readonly unknown[]): Promise<T> =>
    publicClient.readContract({
      address: ledger,
      abi: ledgerAbi,
      functionName,
      args,
    } as never) as Promise<T>;

  return {
    reserve: async () => {
      const campaign = await chain.createCampaign({ fundingTarget: 1000n * USDC, treeTarget: 10 });

      await chain.contributeFrom(campaign, 400n * USDC, DONOR_KEY);
      await chain.contributeFrom(campaign, 600n * USDC);
      await send(OPERATOR_KEY, {
        address: ledger,
        functionName: 'setEstimate',
        args: [campaign, 5000n],
      });
      await send(OPERATOR_KEY, {
        address: ledger,
        functionName: 'issueBatch',
        args: [campaign, 'SRN PPI', 'SRN-2025-00001', 'SRN-2025-16000', 2025, 4000n],
      });

      return campaign;
    },
    reservation: async (campaign) => {
      const [reserved, allocated, declined] = await Promise.all([
        ask<bigint>('reservationOf', [campaign, DONOR]),
        ask<bigint>('allocatedOf', [campaign, DONOR]),
        ask<boolean>('declined', [campaign, DONOR]),
      ]);

      return { reserved, allocated, declined };
    },
    hold: async () => {
      const batch = await chain.issueBatch({ amount: 16_000n, price: USDC });
      const id = BigInt(batch.batchId);

      await chain.fund(500n * USDC);
      await chain.approve(ledger, 500n * USDC);
      await send(DONOR_KEY, { address: ledger, functionName: 'buy', args: [id, 2600n] });

      for (const purpose of ['one', 'two']) {
        await send(DONOR_KEY, {
          address: ledger,
          functionName: 'retire',
          args: [id, 200n, 'Earlier retirement', purpose],
        });
      }

      return batch;
    },
    retirementCount: () => ask<bigint>('retirementCount', []),
  };
};
