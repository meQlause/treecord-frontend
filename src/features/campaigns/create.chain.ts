// What S14 sends to the CampaignFactory (s14-create-campaign.md §2 "Chain"): the preflight that refuses a bad config before
// the wallet is asked, the `createCampaign` write, and the new campaign's address from the `CampaignCreated` log.
import { parseEventLogs, type Address, type Hash, type TransactionReceipt } from 'viem';
import { factoryAbi } from '../../shared/chain/abis';
import { sendWrite, type ChainSession } from '../../shared/chain/wallet';
import type { configOf } from './create.rules';

type Config = ReturnType<typeof configOf>;

/** `validateConfig` and a simulation of the create: either one refusing throws, with nothing sent. */
export const preflight = async (
  { publicClient, account }: ChainSession,
  factory: Address,
  config: Config,
): Promise<void> => {
  await publicClient.readContract({
    address: factory,
    abi: factoryAbi,
    functionName: 'validateConfig',
    args: [config],
  });
  await publicClient.simulateContract({
    address: factory,
    abi: factoryAbi,
    functionName: 'createCampaign',
    args: [config],
    account,
  });
};

export const create = (session: ChainSession, factory: Address, config: Config): Promise<Hash> =>
  sendWrite(session, {
    address: factory,
    abi: factoryAbi,
    functionName: 'createCampaign',
    args: [config],
  });

/** The address in the receipt's `CampaignCreated` log, or `null` when the receipt holds none. */
export const createdAddress = (receipt: TransactionReceipt): Address | null =>
  parseEventLogs({ abi: factoryAbi, eventName: 'CampaignCreated', logs: receipt.logs })[0]?.args
    .campaign ?? null;
