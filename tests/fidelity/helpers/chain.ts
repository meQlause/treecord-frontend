// A local anvil (chain 31337) with the frozen contracts deployed by `Deploy.s.sol`, for the wallet specs (F2b, fidelity.md §2
// "Chain": a fresh local chain, interval mining, a funded test wallet, never a public RPC). One chain per Playwright worker,
// started by the first test that asks for it; every test starts from the same snapshot, so one test's campaigns, USDC and
// clock never reach another. The deployer, operator and the donor keys are anvil's own public development keys.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  http,
  parseAbi,
  stringToHex,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { campaignAbi, erc20Abi } from '../../../src/shared/chain/abis';
import { test as flow } from './flow';

const CONTRACTS = resolve('..', 'treecord-backend', 'packages', 'contracts');
const RPC = 'http://127.0.0.1:8545';
const BOOT_MS = 30_000;
const ANVIL = join(
  homedir(),
  '.foundry',
  'bin',
  process.platform === 'win32' ? 'anvil.exe' : 'anvil',
);
const POLL_MS = 250;
const WEEK = 7 * 24 * 3600;
const USDC = 1_000_000n;

/** Anvil's account #1 (the operator, who may create a campaign for anyone) and #5 (the test donor and planter wallet). */
const OPERATOR_KEY: Hex = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

export const DONOR_KEY: Hex = '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba';

export const DONOR = privateKeyToAccount(DONOR_KEY).address;

/** A second wallet, for "somebody else contributed". */
const OTHER_KEY: Hex = '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e';

const factoryAbi = parseAbi([
  'struct Split { uint16 incentivesBps; uint16 seedlingsBps; uint16 verificationBps; uint16 reserveBps; uint16 feeBps; }',
  'struct Config { address creator; string metadataURI; bytes32 speciesCode; bytes8 regionGeohash; uint32 regionRadiusM; uint32 treeTarget; uint16 anchorBps; uint16 perPlanterCap; uint256 fundingTarget; uint64 fundingDeadline; uint64 claimDeadline; uint16 commitmentUnits; uint64 timeUnit; Split split; }',
  'function createCampaign(Config cfg) returns (address)',
  'function campaignCount() view returns (uint256)',
  'function campaignAt(uint256 index) view returns (address)',
]);

const mockUsdcAbi = parseAbi(['function mint(address to, uint256 amount)']);

const completeAbi = parseAbi(['function complete()']);

type Deployment = { usdc: Address; campaignFactory: Address };

const deployment = (): Deployment =>
  JSON.parse(readFileSync(resolve(CONTRACTS, 'deployments', '31337.json'), 'utf8')) as Deployment;

const alive = async (): Promise<boolean> =>
  fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
  }).then(
    (response) => response.ok,
    () => false,
  );

const sleep = (millis: number): Promise<void> => new Promise((done) => setTimeout(done, millis));

const waitForRpc = async (): Promise<void> => {
  for (let waited = 0; waited < BOOT_MS; waited += POLL_MS) {
    if (await alive()) {
      return;
    }

    await sleep(POLL_MS);
  }

  throw new Error('anvil did not come up');
};

/** Deploys the contracts when this anvil has none (a fresh one has no code at the deployment's USDC address). */
const deployOnce = async (): Promise<void> => {
  const client = createPublicClient({ chain: foundry, transport: http(RPC) });
  const code = await client.getCode({ address: deployment().usdc });

  if (code === undefined) {
    execFileSync(
      process.execPath,
      [
        'script/with-env.mjs',
        '--env',
        '.env.anvil',
        'forge',
        'script',
        'script/Deploy.s.sol',
        '--rpc-url',
        'anvil',
        '--broadcast',
      ],
      { cwd: CONTRACTS, stdio: 'ignore', timeout: BOOT_MS * 4 },
    );
  }
};

type CampaignOptions = {
  fundingTarget?: bigint;
  /** Seconds from now to the funding deadline. */
  fundingDeadlineIn?: number;
  treeTarget?: number;
};

export type State = {
  status: number;
  raised: bigint;
  contributed: bigint;
  claimed: boolean;
  target: bigint;
  deadline: bigint;
  claimDeadline: bigint;
  pool: bigint;
  now: bigint;
};

export type Chain = {
  usdc: Address;
  /** A campaign in Funding, created by the operator for the test donor. */
  createCampaign: (options?: CampaignOptions) => Promise<Address>;
  /** `key` (default: the other wallet) mints and contributes `amount` USDC base units. */
  contributeFrom: (campaign: Address, amount: bigint, key?: Hex) => Promise<void>;
  /** Gives the test donor `amount` USDC base units. */
  fund: (amount: bigint) => Promise<void>;
  /** The test donor allows the campaign to pull `amount`. */
  approve: (campaign: Address, amount: bigint) => Promise<void>;
  /** Anyone may start refunds once the funding deadline has passed unfunded. */
  startRefunding: (campaign: Address) => Promise<void>;
  /** Completes an Active campaign whose commitment period is over (warp first). */
  complete: (campaign: Address) => Promise<void>;
  /** The test donor claims their refund. */
  claimRefund: (campaign: Address) => Promise<void>;
  /** Moves the chain's clock forward and mines a block. */
  warp: (seconds: number) => Promise<void>;
  allowanceOf: (campaign: Address) => Promise<bigint>;
  read: (campaign: Address) => Promise<State>;
};

const clients = () => ({
  publicClient: createPublicClient({
    chain: foundry,
    transport: http(RPC),
    pollingInterval: POLL_MS,
  }),
  testClient: createTestClient({ chain: foundry, mode: 'anvil', transport: http(RPC) }),
});

const walletOf = (key: Hex) =>
  createWalletClient({ account: privateKeyToAccount(key), chain: foundry, transport: http(RPC) });

type Wallet = ReturnType<typeof walletOf>;

type Ctx = {
  usdc: Address;
  factory: Address;
  publicClient: ReturnType<typeof clients>['publicClient'];
  testClient: ReturnType<typeof clients>['testClient'];
  operator: Wallet;
  donor: Wallet;
};

const mined = async (ctx: Ctx, hash: Hex): Promise<void> => {
  await ctx.publicClient.waitForTransactionReceipt({ hash });
};

const mint = async (ctx: Ctx, to: Address, amount: bigint): Promise<void> => {
  await mined(
    ctx,
    await ctx.operator.writeContract({
      address: ctx.usdc,
      abi: mockUsdcAbi,
      functionName: 'mint',
      args: [to, amount],
    }),
  );
};

const campaignCall = async (
  ctx: Ctx,
  wallet: Wallet,
  address: Address,
  functionName: 'markRefunding' | 'claimRefund',
): Promise<void> => {
  await mined(ctx, await wallet.writeContract({ address, abi: campaignAbi, functionName }));
};

const approveFrom = async (
  ctx: Ctx,
  wallet: Wallet,
  campaign: Address,
  amount: bigint,
): Promise<void> => {
  await mined(
    ctx,
    await wallet.writeContract({
      address: ctx.usdc,
      abi: erc20Abi,
      functionName: 'approve',
      args: [campaign, amount],
    }),
  );
};

/** The writes a spec stages before the page opens: who holds USDC, who allowed what, refunds started or claimed. */
const writesOf = (ctx: Ctx): Omit<Chain, 'createCampaign' | 'read' | 'allowanceOf' | 'usdc'> => ({
  fund: (amount) => mint(ctx, DONOR, amount),
  approve: (campaign, amount) => approveFrom(ctx, ctx.donor, campaign, amount),
  startRefunding: (campaign) => campaignCall(ctx, ctx.operator, campaign, 'markRefunding'),
  claimRefund: (campaign) => campaignCall(ctx, ctx.donor, campaign, 'claimRefund'),
  complete: async (campaign) => {
    await mined(
      ctx,
      await ctx.operator.writeContract({
        address: campaign,
        abi: completeAbi,
        functionName: 'complete',
      }),
    );
  },
  warp: async (seconds) => {
    await ctx.testClient.increaseTime({ seconds });
    await ctx.testClient.mine({ blocks: 1 });
  },
  contributeFrom: async (campaign, amount, key = OTHER_KEY) => {
    const wallet = walletOf(key);

    await mint(ctx, wallet.account.address, amount);
    await approveFrom(ctx, wallet, campaign, amount);
    await mined(
      ctx,
      await wallet.writeContract({
        address: campaign,
        abi: campaignAbi,
        functionName: 'contribute',
        args: [amount],
      }),
    );
  },
});

/** What the chain says about a campaign and the test donor, as the page would read it. */
const readState = async (ctx: Ctx, campaign: Address): Promise<State> => {
  const view = <Name extends 'status' | 'totalRaised' | 'refundPool' | 'config'>(
    functionName: Name,
  ) => ctx.publicClient.readContract({ address: campaign, abi: campaignAbi, functionName });
  const [status, raised, pool, config, block, contributed, claimed] = await Promise.all([
    view('status'),
    view('totalRaised'),
    view('refundPool'),
    view('config'),
    ctx.publicClient.getBlock(),
    ctx.publicClient.readContract({
      address: campaign,
      abi: campaignAbi,
      functionName: 'contributions',
      args: [DONOR],
    }),
    ctx.publicClient.readContract({
      address: campaign,
      abi: campaignAbi,
      functionName: 'refundClaimed',
      args: [DONOR],
    }),
  ]);

  return {
    status,
    raised,
    pool,
    contributed,
    claimed,
    target: config.fundingTarget,
    deadline: BigInt(config.fundingDeadline),
    claimDeadline: BigInt(config.claimDeadline),
    now: block.timestamp,
  };
};

const makeCampaign = async (
  ctx: Ctx,
  { fundingTarget = 10_000n * USDC, fundingDeadlineIn = WEEK, treeTarget = 1000 }: CampaignOptions,
): Promise<Address> => {
  const now = (await ctx.publicClient.getBlock()).timestamp;

  await mined(
    ctx,
    await ctx.operator.writeContract({
      address: ctx.factory,
      abi: factoryAbi,
      functionName: 'createCampaign',
      args: [
        {
          creator: DONOR,
          metadataURI: 'treecord://e2e',
          speciesCode: stringToHex('SWIETENIA_MACROPHYLLA', { size: 32 }),
          regionGeohash: stringToHex('qqguwvt', { size: 8 }),
          regionRadiusM: 2500,
          treeTarget,
          anchorBps: 2500,
          perPlanterCap: 50,
          fundingTarget,
          fundingDeadline: now + BigInt(fundingDeadlineIn),
          claimDeadline: now + BigInt(fundingDeadlineIn) + BigInt(WEEK),
          commitmentUnits: 36,
          timeUnit: 3600n,
          split: {
            incentivesBps: 7000,
            seedlingsBps: 1000,
            verificationBps: 500,
            reserveBps: 1000,
            feeBps: 500,
          },
        },
      ],
    }),
  );

  const count = await ctx.publicClient.readContract({
    address: ctx.factory,
    abi: factoryAbi,
    functionName: 'campaignCount',
  });

  return ctx.publicClient.readContract({
    address: ctx.factory,
    abi: factoryAbi,
    functionName: 'campaignAt',
    args: [count - 1n],
  });
};

const chainOf = (): Chain => {
  const { usdc, campaignFactory } = deployment();
  const ctx: Ctx = {
    usdc,
    factory: campaignFactory,
    ...clients(),
    operator: walletOf(OPERATOR_KEY),
    donor: walletOf(DONOR_KEY),
  };

  return {
    usdc,
    ...writesOf(ctx),
    read: (campaign) => readState(ctx, campaign),
    createCampaign: (options = {}) => makeCampaign(ctx, options),
    allowanceOf: (campaign) =>
      ctx.publicClient.readContract({
        address: usdc,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [DONOR, campaign],
      }),
  };
};

type Worker = { chain: Chain };

/** `test` with a `chain`: anvil is started (and the contracts deployed) once per worker, and every test starts clean. */
export const test = flow.extend<{ fresh: undefined }, Worker>({
  chain: [
    // eslint-disable-next-line no-empty-pattern -- Playwright reads the fixture's dependencies from this destructuring
    async ({}, provide) => {
      let anvil: ChildProcess | null = null;

      if (!(await alive())) {
        anvil = spawn(ANVIL, ['--port', '8545', '--block-time', '1'], { stdio: 'ignore' });
        await waitForRpc();
      }

      await deployOnce();
      await provide(chainOf());
      anvil?.kill();
    },
    { scope: 'worker' },
  ],
  fresh: [
    async ({ chain: _started }, provide) => {
      const { testClient } = clients();
      const snapshot = await testClient.snapshot();

      await provide(undefined);
      await testClient.revert({ id: snapshot });
    },
    { auto: true },
  ],
});

export { expect } from './flow';
