// The browser side of the S15 specs: Alex (or a planter) signs in through the real Privy test account, `/app/carbon` opens,
// and the holdings, the load-more page and the retirement record are answered by the spec (the backend does not run). The
// test wallet and the RPC watcher of helpers/wallet-page.ts are in place for D09 and D10.
import type { Page } from '@playwright/test';
import { SARI, meBody, type MeProfile } from '../fixtures/accounts';
import { BATCH_101 } from '../fixtures/carbon';
import type { Json } from '../fixtures/campaigns';
import { answerApi, failure, type ApiAnswer, type ApiCall } from './api';
import { DONOR } from './chain';
import { signInWith, type OpenOptions } from './flow';
import { giveTestWallet, watchRpc, type Rpc } from './wallet-page';

const NOT_FOUND = 404;
const PATH = '/app/carbon';
const RECORD = /^\/carbon\/retirements\/(\d+)$/u;

/** Alex, a donor holding credits, and a planter with the same wallet (the server empties a planter's lists, FR-212). */
const ALEX: MeProfile = {
  ...SARI,
  role: 'donor',
  displayName: 'Alex',
  walletAddress: DONOR,
};

export const PLANTER: MeProfile = { ...SARI, walletAddress: DONOR };

type Answer = Json | ApiAnswer | Promise<Json | ApiAnswer>;

/** A body answers 200; an object with `status` is an error answer. */
const answerOf = (value: Json | ApiAnswer): ApiAnswer =>
  'status' in value ? (value as ApiAnswer) : { body: value };

export type Scene = {
  /** `GET /carbon/holdings`, asked again for every read. */
  holdings: () => Answer;
  /** `GET /carbon/holdings/retirements`, with the call. */
  more?: (call: ApiCall) => Answer;
  /** `GET /carbon/retirements/:id` (S09's record), by id. */
  record?: (id: string) => Answer;
  profile?: MeProfile;
};

export type Visit = { page: Page; rpc: Rpc; calls: ApiCall[] };

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

/** The scene's own answer to a read of the carbon API, or `undefined` when the scene says nothing about it. */
const sceneAnswer = ({ holdings, more, record }: Scene, call: ApiCall): Answer | undefined => {
  const id = RECORD.exec(call.path)?.[1];

  if (call.path === '/carbon/holdings') {
    return holdings();
  }

  if (call.path === '/carbon/holdings/retirements') {
    return more?.(call);
  }

  return id === undefined ? undefined : record?.(id);
};

const responderOf =
  (scene: Scene) =>
  async (call: ApiCall): Promise<ApiAnswer> => {
    if (call.path === '/me') {
      return { body: meBody(scene.profile ?? ALEX) };
    }

    const found = await sceneAnswer(scene, call);

    if (found !== undefined) {
      return answerOf(found);
    }

    // the card art of every batch: the same batch, whatever the id
    return call.path.startsWith('/carbon/batches/')
      ? { body: BATCH_101 }
      : failure(NOT_FOUND, 'not_found');
  };

/** Signs in and presses "Continue" to `/app/carbon`; the page is not waited for, so a spec may hold the holdings back. */
export const openCarbon = async (open: Open, scene: Scene): Promise<Visit> => {
  const { page } = await open({ row: 'S15' });
  let calls: ApiCall[] = [];

  await giveTestWallet(page);

  const rpc = await watchRpc(page);

  await signInWith(page, meBody(scene.profile ?? ALEX), {
    returnTo: PATH,
    setup: async () => {
      calls = await answerApi(page, responderOf(scene));
    },
  });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await page.waitForURL(`**${PATH}`);

  return { page, rpc, calls };
};
