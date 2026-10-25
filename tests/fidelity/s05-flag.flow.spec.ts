// docs/FE/features/s05-tree.md §7, the D07 flag form: #9, #10, #12 and #14 (and the form showing for a contributor). The tree
// is real: a campaign on a local anvil (helpers/chain.ts) with a tree planted through the gateway, so `TreeRegistry.flag`
// is the contract's own. The app signs with the test donor's key through the dev-server seam; `GET /trees/:id` and
// `POST /flags` are answered by the spec from what the chain says (the backend does not run). The ids differ from the
// document's: the tree is the registry's first, not 3001.
import { parseTransaction, decodeFunctionData, keccak256, stringToBytes, type Hex } from 'viem';
import type { Page } from '@playwright/test';
import { treeRegistryAbi } from '../../src/shared/chain/abis';
import { meBody } from './fixtures/accounts';
import { ALEX } from './fixtures/shell-accounts';
import { TREE_3001 } from './fixtures/tree';
import { answerApi, failure, type ApiAnswer, type ApiCall } from './helpers/api';
import { DONOR, expect, test, type Chain } from './helpers/chain';
import { signInWith, type OpenOptions } from './helpers/flow';
import { FLAGGED, plantTree, type PlantedTree } from './helpers/flag-chain';
import { giveTestWallet, watchRpc, type Rpc } from './helpers/wallet-page';

const TEST_MS = 180_000;
const REASON = 'Tree condition needs an independent check.';
const FORBIDDEN = 403;
const CREATED = 201;
const CONFLICT = 409;

test.describe.configure({ timeout: TEST_MS });

type Pending = { id: string; reasonText: string; reasonHash: Hex; createdAt: string };

/** What the API says about the tree and the viewer, besides the chain. */
type State = {
  /** While set, the tree reads as it did before the chain moved. */
  frozen: boolean;
  eligible: boolean;
  blockedBy: string;
  /** The next `POST /flags` is refused with this answer, and the tree then reads as blocked for that reason. */
  refuse: { answer: ApiAnswer; blockedBy: string } | null;
  pending: Pending | null;
  posts: unknown[];
};

type Visit = { page: Page; rpc: Rpc; state: State; tree: PlantedTree };

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

const DONOR_ALEX = { ...ALEX, walletAddress: DONOR };

const flagBody = (tree: PlantedTree) => ({
  id: '1f6c2a9e-4b7d-4e15-9a3c-8d2e5f0b7a61',
  status: 'open',
  reasonText: REASON,
  resolutionNote: null,
  reasonHash: keccak256(stringToBytes(REASON)),
  treeId: tree.treeId,
});

const treeBody = async ({ tree, state }: Pick<Visit, 'tree' | 'state'>) => {
  const flagged = !state.frozen && (await tree.statusOf()) === FLAGGED;

  return {
    ...TREE_3001,
    tree: {
      ...TREE_3001.tree,
      treeId: tree.treeId,
      status: flagged ? 'flagged' : 'alive',
      campaign: { ...TREE_3001.tree.campaign, address: tree.campaign },
    },
    flags: flagged ? [flagBody(tree)] : [],
    viewer: {
      isPlanter: false,
      liveSubmissions: [],
      flag: { eligible: state.eligible, blockedBy: state.eligible ? null : state.blockedBy },
      pendingFlag: flagged ? null : state.pending,
    },
  };
};

const postFlag = (visit: Visit, call: ApiCall): ApiAnswer => {
  const { state, tree } = visit;

  if (state.refuse !== null) {
    state.eligible = false;
    state.blockedBy = state.refuse.blockedBy;

    return state.refuse.answer;
  }

  state.posts.push(call.body);
  state.pending = {
    id: flagBody(tree).id,
    reasonText: REASON,
    reasonHash: keccak256(stringToBytes(REASON)),
    createdAt: '2026-10-25T04:00:00.000Z',
  };

  return { status: CREATED, body: { flag: flagBody(tree) } };
};

/** Alex, a contributor, signed in on the tree. */
const openTree = async (open: Open, chain: Chain): Promise<Visit> => {
  const tree = await plantTree(chain);
  const { page } = await open({ row: 'S05' });
  const state: State = {
    frozen: false,
    eligible: true,
    blockedBy: 'not_contributor',
    refuse: null,
    pending: null,
    posts: [],
  };

  await giveTestWallet(page);

  const rpc = await watchRpc(page);
  const visit: Visit = { page, rpc, state, tree };
  const path = `/trees/${tree.treeId}`;

  await signInWith(page, meBody(DONOR_ALEX), {
    returnTo: path,
    setup: async () => {
      await answerApi(page, async (call) => {
        if (call.path === '/me') {
          return { fallback: true };
        }

        return call.method === 'POST' && call.path === '/flags'
          ? postFlag(visit, call)
          : { body: await treeBody(visit) };
      });
    },
  });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await page.waitForURL(`**${path}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  return visit;
};

const reason = (page: Page) => page.getByLabel(/^Flag reason/u);

const review = (page: Page) => page.getByRole('region', { name: 'Flag tree' });

const confirm = (page: Page) => review(page).getByRole('button', { name: 'Confirm' });

const clock = (page: Page) =>
  page
    .locator('.tr-panel .ws-facts > div')
    .filter({ has: page.getByText('Payout clock', { exact: true }) });

/** The flag(treeId, reasonHash) calldata of the `index`-th transaction the app sent. */
const flagCall = (rpc: Rpc, index = 0) => {
  const raw = rpc.raws()[index] as Hex;

  return decodeFunctionData({ abi: treeRegistryAbi, data: parseTransaction(raw).data as Hex });
};

test('#9 a short reason keeps "Flag tree" disabled; a valid one is saved, then the wallet is asked for flag(treeId, hash)', async ({
  open,
  chain,
}) => {
  const { page, rpc, state, tree } = await openTree(open, chain);

  await reason(page).fill('too short');
  await expect(page.getByRole('button', { name: 'Flag tree' })).toBeDisabled();
  await reason(page).fill(REASON);
  await page.getByRole('button', { name: 'Flag tree' }).click();
  await confirm(page).click();
  await expect(page.getByText('Reason saved', { exact: true })).toBeVisible();
  await expect.poll(() => rpc.sent()).toBe(1);
  expect(state.posts).toEqual([{ treeId: tree.treeId, reasonText: REASON }]);
  expect(flagCall(rpc)).toEqual({
    functionName: 'flag',
    args: [BigInt(tree.treeId), keccak256(stringToBytes(REASON))],
  });
});

test('#10 a rejecting wallet leaves the pending callout; its retry asks the wallet again and saves nothing twice', async ({
  open,
  chain,
}) => {
  const { page, rpc, state, tree } = await openTree(open, chain);

  await reason(page).fill(REASON);
  await page.getByRole('button', { name: 'Flag tree' }).click();
  rpc.refuseNext();
  await confirm(page).click();
  await expect(
    page.getByText(`Pending · ${REASON} Reason saved; no on-chain flag or pause yet.`),
  ).toBeVisible();
  await expect(clock(page)).toContainText('Milestone windows');
  await page.locator('[data-copy="COPY-165"]').click();
  await expect(page.getByText('Flag opened')).toBeVisible();
  expect(state.posts).toHaveLength(1);
  expect(await tree.statusOf()).toBe(FLAGGED);
});

test('#12 the tag and the clock change only when the re-read says flagged, and then the toast shows', async ({
  open,
  chain,
}) => {
  const { page, state, tree } = await openTree(open, chain);

  await reason(page).fill(REASON);
  state.frozen = true;
  await page.getByRole('button', { name: 'Flag tree' }).click();
  await confirm(page).click();
  await expect.poll(() => tree.statusOf()).toBe(FLAGGED);
  await expect(page.locator('.tr-hero .ws-tag')).toHaveText('Alive');
  await expect(clock(page)).toContainText('Milestone windows');
  state.frozen = false;
  await expect(page.locator('.tr-hero .ws-tag')).toHaveText('Flagged');
  await expect(clock(page)).toContainText('Paused');
  await expect(page.getByText('Flag opened')).toBeVisible();
});

test('#14 a refusal as not_contributor shows an alert, and after the re-read the form is gone', async ({
  open,
  chain,
}) => {
  const { page, state } = await openTree(open, chain);

  await reason(page).fill(REASON);
  state.refuse = { answer: failure(FORBIDDEN, 'not_contributor'), blockedBy: 'not_contributor' };
  await page.getByRole('button', { name: 'Flag tree' }).click();
  await confirm(page).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(reason(page)).toHaveCount(0);
});

test('#14 (conflict 5) a tree that can no longer be flagged shows the registry sentence, then the form is gone', async ({
  open,
  chain,
}) => {
  const { page, state } = await openTree(open, chain);

  await reason(page).fill(REASON);
  state.refuse = {
    answer: failure(CONFLICT, 'tree_not_flaggable'),
    blockedBy: 'tree_not_flaggable',
  };
  await page.getByRole('button', { name: 'Flag tree' }).click();
  await confirm(page).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(reason(page)).toHaveCount(0);
});
