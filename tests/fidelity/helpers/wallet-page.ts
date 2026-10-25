// The browser side of the wallet specs: the test wallet the app signs with (the dev-server-only seam `window.treecordE2E`),
// a view of the RPC the app talks to (how many transactions it sent, and a way to make the wallet refuse or a receipt
// revert), and the campaign API answered from what the chain says now (the backend does not run).
import type { Page, Route } from '@playwright/test';
import type { Address } from 'viem';
import { campaignBody, detail, type Json } from '../fixtures/campaigns';
import type { Chain, State } from './chain';
import { DONOR, DONOR_KEY } from './chain';
import { answerApi, failure } from './api';
import type { OpenOptions } from './flow';

const RPC = 'http://127.0.0.1:8545/';
const LOCAL = 31_337;
const BPS = 10_000n;
const NOT_FOUND = 404;
const STATUS = ['funding', 'active', 'refunding', 'completed'] as const;

export type Rpc = {
  /** Every JSON-RPC call the app has made to anvil (reads and sends). */
  calls: () => number;
  /** Send calls so far (`eth_sendRawTransaction`, or `eth_sendTransaction` for a wallet that signs itself). */
  sent: () => number;
  /** The next send is refused the way a declined wallet refuses (EIP-1193 4001). */
  refuseNext: () => void;
  /** The next send is refused for lack of gas. */
  noGasNext: () => void;
  /** Every receipt from now on says the transaction reverted. */
  revertReceipts: () => void;
  /** Holds back every send (or every read) from now on, to look at a pending state, until the returned function is called. */
  hold: (kind: 'send' | 'read') => () => void;
};

type Refusal = { code: number; message: string };

type Call = { id: number; method: string };

const SENDS = new Set(['eth_sendRawTransaction', 'eth_sendTransaction']);

type Held = { kind: 'send' | 'read'; gate: Promise<void> };

const callOf = (route: Route): Call | null => {
  const request = route.request();

  return request.method() === 'POST' ? (request.postDataJSON() as Call) : null;
};

/** The answer of a wallet that refused: an EIP-1193 error in a JSON-RPC envelope. */
const refuse = (route: Route, id: number, error: Refusal): Promise<void> =>
  route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': '*' },
    contentType: 'application/json',
    body: JSON.stringify({ jsonrpc: '2.0', id, error }),
  });

/** The real receipt, saying the transaction reverted. */
const reverted = async (route: Route): Promise<void> => {
  const response = await route.fetch();
  const json = (await response.json()) as { result: { status: string } | null };

  if (json.result !== null) {
    json.result.status = '0x0';
  }

  await route.fulfill({ response, json });
};

const isSend = (call: Call | null): boolean => call !== null && SENDS.has(call.method);

const holds = ({ kind }: Held, call: Call | null): boolean =>
  kind === 'send' ? isSend(call) : call?.method === 'eth_call';

/** Counts and, on request, spoils the calls the app makes to anvil; every other call goes through untouched. */
export const watchRpc = async (page: Page): Promise<Rpc> => {
  let sent = 0;
  let calls = 0;
  let refusal: Refusal | null = null;
  let revert = false;
  let held: Held | null = null;

  const take = (): Refusal | null => {
    const taken = refusal;

    refusal = null;

    return taken;
  };

  const spoils = (call: Call | null): boolean =>
    call?.method === 'eth_getTransactionReceipt' && revert;

  await page.route(RPC, async (route) => {
    const call = callOf(route);
    const sending = isSend(call);

    calls += Number(call !== null);

    if (held !== null && holds(held, call)) {
      await held.gate;
    }

    sent += Number(sending);

    const error = sending ? take() : null;

    if (call !== null && error !== null) {
      await refuse(route, call.id, error);
    } else if (spoils(call)) {
      await reverted(route);
    } else {
      await route.continue();
    }
  });

  return {
    calls: () => calls,
    sent: () => sent,
    refuseNext: () => {
      refusal = { code: 4001, message: 'User rejected the request.' };
    },
    noGasNext: () => {
      refusal = { code: -32_000, message: 'insufficient funds for gas * price + value' };
    },
    revertReceipts: () => {
      revert = true;
    },
    hold: (kind) => {
      const gate = Promise.withResolvers<void>();

      held = { kind, gate: gate.promise };

      return () => gate.resolve();
    },
  };
};

/** The app signs with the test donor's key (the seam exists only in the dev server and only on chain 31337). */
export const giveTestWallet = async (page: Page): Promise<void> => {
  await page.addInitScript((key) => {
    Object.assign(window, { treecordE2E: { privateKey: key, chainId: 31_337 } });
  }, DONOR_KEY);
};

const viewerOf = (state: State, role: string, wallet: Address | null): Json => ({
  role,
  walletAddress: wallet,
  contributedAmount: String(state.contributed),
  refundedAmount: state.claimed ? String(state.contributed) : '0',
  claim: null,
});

const iso = (seconds: bigint): string => new Date(Number(seconds) * 1000).toISOString();

/** What a spec changes in the campaign answer: the wallet the profile carries (`null` = not provisioned yet), the chain it names. */
export type Changes = { wallet?: Address | null; chainId?: number };

/** `GET /campaigns/:address` as the chain now says it: the status, the raised total, the deadline, the viewer's own figures. */
const bodyOf = (address: Address, state: State, changes: Changes): Json => {
  const status = STATUS[state.status] ?? 'funding';

  return campaignBody(
    detail({
      address,
      chainId: changes.chainId ?? LOCAL,
      status,
      fundingTarget: String(state.target),
      fundedAmount: String(state.raised),
      progressBps: Number((state.raised * BPS) / state.target),
      fundingDeadline: iso(state.deadline),
      claimDeadline: iso(state.claimDeadline),
      fundingDeadlinePassed: status === 'funding' && state.now >= state.deadline,
      claimDeadlinePassed: state.now >= state.claimDeadline,
      daysLeft: null,
    }),
    viewerOf(state, 'donor', changes.wallet === undefined ? DONOR : changes.wallet),
  );
};

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

export type Visit = {
  page: Page;
  rpc: Rpc;
  /** Holds back the campaign reads from now on (the page keeps what it has) until `release` is called. */
  hold: () => () => void;
};

/** Opens the campaign as the test donor: the wallet seam, the RPC watcher and the API answered from the chain. */
export const visitCampaign = async (
  open: Open,
  chain: Chain,
  address: Address,
  changes: Changes = {},
): Promise<Visit> => {
  const { page } = await open({ row: 'S04' });
  let held: Promise<void> | null = null;

  await giveTestWallet(page);

  const rpc = await watchRpc(page);

  await answerApi(page, async (call) => {
    if (call.path !== `/campaigns/${address}`) {
      return failure(NOT_FOUND, 'not_found');
    }

    await held;

    return { body: bodyOf(address, await chain.read(address), changes) };
  });
  await page.goto(`/campaigns/${address}`);
  await page.getByRole('heading', { level: 1 }).waitFor();

  return {
    page,
    rpc,
    hold: () => {
      const gate = Promise.withResolvers<void>();

      held = gate.promise;

      return () => gate.resolve();
    },
  };
};
