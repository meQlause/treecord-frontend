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

type Rpc = {
  /** Send calls so far (`eth_sendRawTransaction`, or `eth_sendTransaction` for a wallet that signs itself). */
  sent: () => number;
  /** The next send is refused the way a declined wallet refuses (EIP-1193 4001). */
  refuseNext: () => void;
  /** The next send is refused for lack of gas. */
  noGasNext: () => void;
  /** Every receipt from now on says the transaction reverted. */
  revertReceipts: () => void;
};

type Refusal = { code: number; message: string };

type Call = { id: number; method: string };

const SENDS = new Set(['eth_sendRawTransaction', 'eth_sendTransaction']);

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

/** Counts and, on request, spoils the calls the app makes to anvil; every other call goes through untouched. */
const watchRpc = async (page: Page): Promise<Rpc> => {
  let sent = 0;
  let refusal: Refusal | null = null;
  let revert = false;

  await page.route(RPC, async (route) => {
    const call = callOf(route);
    const isSend = call !== null && SENDS.has(call.method);

    sent += isSend ? 1 : 0;

    if (isSend && refusal !== null) {
      const error = refusal;

      refusal = null;
      await refuse(route, call.id, error);
    } else if (call?.method === 'eth_getTransactionReceipt' && revert) {
      await reverted(route);
    } else {
      await route.continue();
    }
  });

  return {
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
  };
};

/** The app signs with the test donor's key (the seam exists only in the dev server and only on chain 31337). */
const giveTestWallet = async (page: Page): Promise<void> => {
  await page.addInitScript((key) => {
    Object.assign(window, { treecordE2E: { privateKey: key } });
  }, DONOR_KEY);
};

const viewerOf = (state: State, role: string): Json => ({
  role,
  walletAddress: DONOR,
  contributedAmount: String(state.contributed),
  refundedAmount: state.claimed ? String(state.contributed) : '0',
  claim: null,
});

const iso = (seconds: bigint): string => new Date(Number(seconds) * 1000).toISOString();

/** `GET /campaigns/:address` as the chain now says it: the status, the raised total, the deadline, the viewer's own figures. */
const bodyOf = (address: Address, state: State, role = 'donor'): Json => {
  const status = STATUS[state.status] ?? 'funding';

  return campaignBody(
    detail({
      address,
      chainId: LOCAL,
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
    viewerOf(state, role),
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
  row = 'S04',
): Promise<Visit> => {
  const { page } = await open({ row });
  let held: Promise<void> | null = null;

  await giveTestWallet(page);

  const rpc = await watchRpc(page);

  await answerApi(page, async (call) => {
    if (call.path !== `/campaigns/${address}`) {
      return failure(NOT_FOUND, 'not_found');
    }

    await held;

    return { body: bodyOf(address, await chain.read(address)) };
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
