// The browser side of the S14 specs: the donor (or a planter) signs in through the real Privy test account and `/app/campaigns/new`
// opens, with `GET /species`, `POST /campaigns/metadata` and `GET /campaigns/:address` answered by the spec, and the test wallet
// signing on the local anvil through the factory the seam names. The backend does not run.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { SARI, meBody, type MeProfile } from '../fixtures/accounts';
import { SPECIES } from '../fixtures/campaigns';
import { answerApi, failure, type ApiAnswer, type ApiCall } from './api';
import { DONOR } from './chain';
import { signInWith, type OpenOptions } from './flow';
import { giveTestWallet, watchRpc, type Rpc } from './wallet-page';

const NOT_FOUND = 404;
const PATH = '/app/campaigns/new';
const TIME_UNIT = 3600;

/** campaigns.md §4's example answer to `POST /campaigns/metadata`. */
const METADATA_ID = '7d5c9b8e-1f4a-4c2e-9a3b-6f0e2d1c4b5a';

export const METADATA_URI = `http://localhost:3001/api/v1/campaigns/metadata/${METADATA_ID}`;

/** Alex, a donor with a wallet; a planter, who may not create campaigns. */
export const ALEX: MeProfile = {
  ...SARI,
  role: 'donor',
  displayName: 'Alex',
  walletAddress: DONOR,
};

export const PLANTER: MeProfile = { ...SARI, walletAddress: DONOR };

const factory = (): string =>
  (
    JSON.parse(readFileSync(resolve('..', 'contracts', 'deployments', '31337.json'), 'utf8')) as {
      campaignFactory: string;
    }
  ).campaignFactory;

export type Scene = {
  profile?: MeProfile;
  /** The answer to `POST /campaigns/metadata`; the body it received is in `Visit.posts`. */
  metadata?: () => ApiAnswer | Promise<ApiAnswer>;
  /** Reads of `GET /campaigns/:address` so far (1 for the first); the default answers 200 at once. */
  found?: (read: number) => ApiAnswer;
};

export type Visit = { page: Page; rpc: Rpc; calls: ApiCall[]; posts: unknown[] };

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

const IS_CAMPAIGN = /^\/campaigns\/0x/u;

const responderOf = (scene: Scene, posts: unknown[]) => {
  let reads = 0;

  return async (call: ApiCall): Promise<ApiAnswer> => {
    if (call.path === '/campaigns/metadata') {
      posts.push(call.body);

      return (
        (await scene.metadata?.()) ?? {
          status: 201,
          body: { id: METADATA_ID, metadataURI: METADATA_URI },
        }
      );
    }

    if (IS_CAMPAIGN.test(call.path)) {
      reads += 1;

      return scene.found?.(reads) ?? { body: { campaign: {} } };
    }

    const known: Record<string, ApiAnswer> = {
      '/me': { fallback: true },
      '/species': { body: SPECIES },
    };

    return known[call.path] ?? failure(NOT_FOUND, 'not_found');
  };
};

/** Signs in and presses "Continue" to `/app/campaigns/new`; the page itself is for the spec to wait for. */
export const openCreate = async (open: Open, scene: Scene = {}): Promise<Visit> => {
  const { page } = await open({ row: 'S14' });
  const posts: unknown[] = [];
  let calls: ApiCall[] = [];

  await giveTestWallet(page, { factory: factory(), timeUnit: TIME_UNIT });

  const rpc = await watchRpc(page);

  await signInWith(page, meBody(scene.profile ?? ALEX), {
    returnTo: PATH,
    setup: async () => {
      calls = await answerApi(page, responderOf(scene, posts));
    },
  });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await page.waitForURL(`**${PATH}`);

  return { page, rpc, calls, posts };
};
