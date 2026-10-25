// The browser side of the S27 spec: the operator signs in through the real Privy test account, `/app/operator/campaigns/:address`
// opens, and the read model, the batches, the four writes and the jobs are answered by the spec (the backend does not run).
import type { Page } from '@playwright/test';
import { SARI, meBody, type MeProfile } from '../fixtures/accounts';
import type { Json } from '../fixtures/campaigns';
import { JOB, ROOTS, ROOTS_OPS, job } from '../fixtures/operations';
import { answerApi, failure, type ApiAnswer, type ApiCall } from './api';
import { signInWith, type OpenOptions } from './flow';

const NOT_FOUND = 404;
const ACCEPTED = 202;

export const RAKA: MeProfile = { ...SARI, role: 'operator', displayName: 'Raka' };

export type Scene = {
  profile?: MeProfile;
  address?: string;
  /** The read model as each read finds it. */
  campaign?: () => Json | ApiAnswer;
  /** The price tab's batches. */
  batches?: () => Json[];
  /** The answer to each write, by the path it went to and how many writes went before it. */
  write?: (call: ApiCall, before: number) => ApiAnswer;
  /** `GET /jobs/:id`. */
  job?: () => Json;
};

export type Visit = { page: Page; calls: ApiCall[]; writes: ApiCall[] };

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

const WRITE =
  /^\/operator\/(campaigns\/[^/]+\/(anchor-assignments|estimate|issuances)|carbon\/batches\/\d+\/price)$/u;

const asAnswer = (value: Json | ApiAnswer): ApiAnswer =>
  typeof (value as ApiAnswer).status === 'number' || 'body' in value
    ? (value as ApiAnswer)
    : { body: value };

/** The scene's answer to a read, by path; a path it does not know is a 404. */
const readOf = (scene: Scene, call: ApiCall): ApiAnswer => {
  const reads: Record<string, () => ApiAnswer> = {
    '/me': () => ({ fallback: true }),
    '/carbon/batches': () => ({
      body: { items: scene.batches?.() ?? [], nextCursor: null, total: 0 },
    }),
    [`/jobs/${JOB}`]: () => ({ body: scene.job?.() ?? job('anchor_assign', 'pending') }),
    [`/operator/campaigns/${scene.address ?? ROOTS}`]: () =>
      asAnswer(scene.campaign?.() ?? ROOTS_OPS),
  };

  return reads[call.path]?.() ?? failure(NOT_FOUND, 'not_found');
};

const responderOf =
  (scene: Scene, writes: ApiCall[]) =>
  (call: ApiCall): ApiAnswer => {
    if (!WRITE.test(call.path)) {
      return readOf(scene, call);
    }

    writes.push(call);

    return (
      scene.write?.(call, writes.length - 1) ?? {
        status: ACCEPTED,
        body: job('anchor_assign', 'pending'),
      }
    );
  };

/** Signs in and presses "Continue" to the campaign's operations page (the page itself is for the spec to wait for). */
export const openOperations = async (open: Open, scene: Scene = {}): Promise<Visit> => {
  const { page } = await open({ row: 'S27' });
  const writes: ApiCall[] = [];
  const path = `/app/operator/campaigns/${scene.address ?? ROOTS}`;
  let calls: ApiCall[] = [];

  await signInWith(page, meBody(scene.profile ?? RAKA), {
    returnTo: path,
    setup: async () => {
      calls = await answerApi(page, responderOf(scene, writes));
    },
  });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await page.waitForURL(`**${path}`);

  return { page, calls, writes };
};
