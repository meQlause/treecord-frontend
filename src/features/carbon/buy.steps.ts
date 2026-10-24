// The steps of D08 (s08-batch.md §2 "Chain", §3.3), apart from the screen: the allowance, `approve(CarbonLedger, quote)` (the
// quote exactly, never unlimited), `buy(batchId, units)` waiting for its receipt, then the holdings until the buy is indexed.
// A step that cannot go on throws a `WalletAbortError`: nothing more is sent and the form returns to Edit with its line.
import { parseEventLogs, type Address, type Hash } from 'viem';
import { api } from '../../app/session/api';
import { campaignAbi, carbonLedgerAbi, erc20Abi, rolesAbi } from '../../shared/chain/abis';
import { outcomeOf } from '../../shared/chain/errors';
import { publicClientOf, sendWrite, settle, type ChainSession } from '../../shared/chain/wallet';
import { WalletAbortError } from '../../shared/ui/useWalletTx';
import { quoteOf } from './buy.rules';

const POLL_FIRST_MS = 2000;
const POLL_MAX_MS = 5000;
const POLL_GROWTH = 1.5;
const POLL_TRIES = 60;

/** What the person is buying and what the chain said at submit. */
export type Plan = {
  units: bigint;
  price: string;
  quote: bigint;
  /** The buyer's balance of this batch before the purchase. */
  before: bigint;
  allowance: bigint;
  ledger: Address;
  usdc: Address;
};

export type Message = 'rejected' | 'failed' | 'priceChanged' | null;

export type Bought = { units: bigint; paid: bigint };

export type Context = {
  session: (chainId: number) => Promise<ChainSession>;
  chainId: number;
  batchId: string;
  plan: Plan | null;
  hash: { current: Hash | null };
  paid: { current: bigint };
  setPlan: (plan: Plan) => void;
  setMessage: (message: Message) => void;
  setBought: (bought: Bought) => void;
  /** Re-reads the batch; answers with its price now. */
  reread: () => Promise<string | null>;
};

type Holdings = { balances: { batchId: string; amount: string }[] };

const sleep = (millis: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, millis));

/** The buyer's balance of `batchId` (the API row, "0" when there is none). */
const holdingOf = async (batchId: string): Promise<bigint> => {
  const { balances } = await api<Holdings>('/carbon/holdings');

  return BigInt(balances.find((row) => row.batchId === batchId)?.amount ?? '0');
};

/** The ledger the campaign's roles point at: `roles()` of the campaign, then `carbonLedger()` of the roles. */
export const readLedger = async (chainId: number, campaign: Address): Promise<Address> => {
  const client = publicClientOf(chainId);

  if (client === null) {
    throw new Error('chain');
  }

  const roles = await client.readContract({
    address: campaign,
    abi: campaignAbi,
    functionName: 'roles',
  });

  return client.readContract({ address: roles, abi: rolesAbi, functionName: 'carbonLedger' });
};

/** The ledger, the USDC it takes, and what the wallet allowed it. */
const readAllowance = async (
  chainId: number,
  campaign: Address,
  account: Address,
): Promise<Pick<Plan, 'ledger' | 'usdc' | 'allowance'>> => {
  const client = publicClientOf(chainId);

  if (client === null) {
    throw new Error('chain');
  }

  const [ledger, usdc] = await Promise.all([
    readLedger(chainId, campaign),
    client.readContract({ address: campaign, abi: campaignAbi, functionName: 'usdc' }),
  ]);
  const allowance = await client.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account, ledger],
  });

  return { ledger, usdc, allowance };
};

type Request = {
  units: bigint;
  /** The price the person was quoted on screen. */
  shown: string | null;
  batchId: string;
  chainId: number;
  account: Address;
  /** Re-reads the batch. */
  refetch: () => Promise<
    { usdcPerTonne: string | null; campaign: { address: string } } | undefined
  >;
};

/** Submit's reads (state 13): the batch again, the holdings and the allowance. `'priceChanged'` when the price moved. */
export const prepare = async (request: Request): Promise<Plan | 'priceChanged'> => {
  const fresh = await request.refetch();

  if (fresh === undefined || fresh.usdcPerTonne !== request.shown) {
    return 'priceChanged';
  }

  const price = fresh.usdcPerTonne ?? '0';
  const [before, chain] = await Promise.all([
    holdingOf(request.batchId),
    readAllowance(request.chainId, fresh.campaign.address as Address, request.account),
  ]);

  return {
    units: request.units,
    price,
    quote: quoteOf(request.units, BigInt(price)) ?? BigInt(0),
    before,
    ...chain,
  };
};

/** A failure ends the flow at Edit: "rejected" when the wallet said no, else "failed"; the batch is read again either way. */
const fail = async (context: Context, error: unknown): Promise<never> => {
  if (error instanceof WalletAbortError) {
    throw error;
  }

  const price = await context.reread().catch(() => null);

  const moved = price !== null && context.plan !== null && price !== context.plan.price;
  const kind: Message = outcomeOf(error) === 'rejected' ? 'rejected' : 'failed';

  context.setMessage(moved ? 'priceChanged' : kind);
  throw new WalletAbortError('idle');
};

export const approve = async (context: Context): Promise<void> => {
  const { plan } = context;

  if (plan === null) {
    return;
  }

  try {
    const wallet = await context.session(context.chainId);

    context.setMessage(null);
    await settle(
      wallet,
      await sendWrite(wallet, {
        address: plan.usdc,
        abi: erc20Abi,
        functionName: 'approve',
        args: [plan.ledger, plan.quote],
      }),
    );
    context.setPlan({ ...plan, allowance: plan.quote });
  } catch (error) {
    await fail(context, error);
  }
};

/** `buy`, held until its receipt (state 17); the event says how much was paid. */
export const send = async (context: Context): Promise<void> => {
  const { plan } = context;

  if (plan === null) {
    return;
  }

  try {
    const wallet = await context.session(context.chainId);

    context.setMessage(null);
    context.hash.current = await sendWrite(wallet, {
      address: plan.ledger,
      abi: carbonLedgerAbi,
      functionName: 'buy',
      args: [BigInt(context.batchId), plan.units],
    });

    const receipt = await settle(wallet, context.hash.current);
    const [purchased] = parseEventLogs({
      abi: carbonLedgerAbi,
      logs: receipt.logs,
      eventName: 'Purchased',
    });

    context.paid.current = purchased?.args.usdcPaid ?? plan.quote;
  } catch (error) {
    await fail(context, error);
  }
};

/** State 18: the holdings, asked every 2 to 5 s, until they show the purchase. The receipt already confirmed it. */
export const index = async (context: Context): Promise<void> => {
  const { plan } = context;

  if (plan === null) {
    return;
  }

  let wait = POLL_FIRST_MS;

  for (let attempt = 0; attempt < POLL_TRIES; attempt += 1) {
    const held = await holdingOf(context.batchId).catch(() => null);

    if (held !== null && held >= plan.before + plan.units) {
      context.setBought({ units: plan.units, paid: context.paid.current });

      return;
    }

    await sleep(wait);
    wait = Math.min(POLL_MAX_MS, wait * POLL_GROWTH);
  }
};
