// What S04's wallet actions read from the chain at action time (s04-campaign.md "Chain calls"): the campaign's own figures,
// the wallet's allowance and balance, the refund figures. bigint base units all the way; nothing here sends a transaction.
import type { Address, PublicClient } from 'viem';
import { campaignAbi, erc20Abi } from '../../shared/chain/abis';

/** `CampaignStatus` of the contract. */
export const CHAIN_STATUS = { funding: 0, active: 1, refunding: 2, completed: 3 } as const;

export type Facts = {
  status: number;
  target: bigint;
  deadline: bigint;
  raised: bigint;
  now: bigint;
};

/** Status, funding target and deadline, the raised total and the latest block's time. */
export const readFacts = async (client: PublicClient, campaign: Address): Promise<Facts> => {
  const [config, status, raised, block] = await Promise.all([
    client.readContract({ address: campaign, abi: campaignAbi, functionName: 'config' }),
    client.readContract({ address: campaign, abi: campaignAbi, functionName: 'status' }),
    client.readContract({ address: campaign, abi: campaignAbi, functionName: 'totalRaised' }),
    client.getBlock(),
  ]);

  return {
    status,
    target: config.fundingTarget,
    deadline: BigInt(config.fundingDeadline),
    raised,
    now: block.timestamp,
  };
};

export type WalletFigures = { usdc: Address; allowance: bigint; balance: bigint };

/** The wallet's USDC allowance towards the campaign and its balance; the token is the campaign's own. */
export const readWallet = async (
  client: PublicClient,
  campaign: Address,
  account: Address,
): Promise<WalletFigures> => {
  const usdc = await client.readContract({
    address: campaign,
    abi: campaignAbi,
    functionName: 'usdc',
  });
  const [allowance, balance] = await Promise.all([
    client.readContract({
      address: usdc,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account, campaign],
    }),
    client.readContract({
      address: usdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account],
    }),
  ]);

  return { usdc, allowance, balance };
};

export type RefundFigures = {
  status: number;
  contributed: bigint;
  claimed: boolean;
  pool: bigint;
  raised: bigint;
};

/** What D05 shows a contributor: their contribution, whether it was claimed, the pool and the total. */
export const readRefund = async (
  client: PublicClient,
  campaign: Address,
  account: Address,
): Promise<RefundFigures> => {
  const read = <Name extends 'status' | 'refundPool' | 'totalRaised'>(functionName: Name) =>
    client.readContract({ address: campaign, abi: campaignAbi, functionName });
  const [status, pool, raised, contributed, claimed] = await Promise.all([
    read('status'),
    read('refundPool'),
    read('totalRaised'),
    client.readContract({
      address: campaign,
      abi: campaignAbi,
      functionName: 'contributions',
      args: [account],
    }),
    client.readContract({
      address: campaign,
      abi: campaignAbi,
      functionName: 'refundClaimed',
      args: [account],
    }),
  ]);

  return { status, contributed, claimed, pool, raised };
};
