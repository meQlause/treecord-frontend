// The browser side of the carbon wallet specs (S08 D08, S15): the batch and the holdings answered from what the ledger says
// now (with a freeze, to show "nothing changes before the holdings do"), the buyer signed in through the real Privy test
// account, and the test wallet and RPC watcher of helpers/wallet-page.ts. The backend does not run.
import type { Page } from '@playwright/test';
import type { Address } from 'viem';
import { SARI, meBody, type MeProfile } from '../fixtures/accounts';
import { BATCH_101 } from '../fixtures/carbon';
import type { Json } from '../fixtures/campaigns';
import { answerApi, failure, type ApiAnswer, type ApiCall } from './api';
import type { Chain } from './chain';
import { DONOR } from './chain';
import { signInWith, type OpenOptions } from './flow';
import { giveTestWallet, watchRpc, type Rpc } from './wallet-page';

const NOT_FOUND = 404;

/** The test donor with a wallet (the key the app signs with), and a planter. */
const BUYER: MeProfile = {
  ...SARI,
  role: 'donor',
  displayName: 'Alex',
  walletAddress: DONOR,
};

export const PLANTER: MeProfile = { ...SARI, walletAddress: DONOR };

type Frozen = { inventory: bigint; held: bigint };

type Shop = {
  /** The price the batch API answers with. */
  price: string;
  /** While set, the batch and the holdings answer these figures whatever the chain holds. */
  frozen: Frozen | null;
  /** Batch reads so far. */
  batchReads: () => number;
};

export type Visit = { page: Page; rpc: Rpc; shop: Shop };

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

type Batch = { batchId: string; campaign: Address };

export type Who = {
  /** `null` is a visitor who is not signed in; the default is the buyer. */
  profile?: MeProfile | null;
  price?: string;
};

const availabilityOf = (inventory: bigint, price: string): string => {
  if (price === '0') {
    return 'price_not_set';
  }

  return inventory === BigInt(0) ? 'sold_out' : 'available';
};

const batchBody = (batch: Batch, shop: Shop, inventory: bigint): Json => ({
  ...BATCH_101,
  batchId: batch.batchId,
  campaign: { ...(BATCH_101.campaign as Json), address: batch.campaign },
  inventoryAmount: String(inventory),
  usdcPerTonne: shop.price,
  availability: availabilityOf(inventory, shop.price),
});

/** The API as the ledger says it: the profile, the batch and the holdings of the test donor. */
type Scene = {
  chain: Chain;
  batch: Batch;
  shop: Shop;
  profile: MeProfile | null;
  reads: { count: number };
};

const responderOf =
  ({ chain, batch, shop, profile, reads }: Scene) =>
  async (call: ApiCall): Promise<ApiAnswer> => {
    const state = await chain.carbonState(batch.batchId);
    const { inventory, held } = shop.frozen ?? state;

    if (call.path === '/me' && profile !== null) {
      return { body: meBody(profile) };
    }

    if (call.path === `/carbon/batches/${batch.batchId}`) {
      reads.count += 1;

      return { body: batchBody(batch, shop, inventory) };
    }

    if (call.path === '/carbon/holdings') {
      return {
        body: {
          wallet: DONOR,
          summary: {},
          reservations: [],
          balances: [{ batchId: batch.batchId, amount: String(held) }],
        },
      };
    }

    return failure(NOT_FOUND, 'not_found');
  };

const sceneOf = (who: Who) => {
  const reads = { count: 0 };
  const shop: Shop = {
    price: who.price ?? '18500000',
    frozen: null,
    batchReads: () => reads.count,
  };

  return { profile: who.profile === undefined ? BUYER : who.profile, reads, shop };
};

/**
 * Opens `/carbon/{batchId}` as the profile of `who` (signed in through Privy) or signed out: the batch and the holdings are
 * answered from the ledger, the test wallet signs, the RPC is watched.
 */
export const visitBatch = async (
  open: Open,
  chain: Chain,
  batch: Batch,
  who: Who = {},
): Promise<Visit> => {
  const { profile, reads, shop } = sceneOf(who);
  const { page } = await open({ row: 'S08' });
  const path = `/carbon/${batch.batchId}`;
  const serve = async (): Promise<void> => {
    await answerApi(page, responderOf({ chain, batch, shop, profile, reads }));
  };

  await giveTestWallet(page);

  const rpc = await watchRpc(page);

  if (profile === null) {
    await serve();
    await page.goto(path);
  } else {
    await signInWith(page, meBody(profile), { returnTo: path, setup: serve });
    await page.getByRole('button', { name: /^Continue to/u }).click();
    await page.waitForURL(`**${path}`);
  }

  await page.getByRole('heading', { level: 1 }).waitFor();

  return { page, rpc, shop };
};
