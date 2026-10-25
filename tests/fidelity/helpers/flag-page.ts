// The browser side of the S29 spec: the operator signs in through the real Privy test account, the flag page opens, and the flag,
// the resolve write and the job are answered by the spec (the backend does not run).
import type { Page } from '@playwright/test';
import { meBody, type MeProfile } from '../fixtures/accounts';
import type { Json } from '../fixtures/campaigns';
import { OPERATOR } from '../fixtures/evidence';
import { FLAG_ID, FLAG_OPEN, RESOLVE_JOB, job } from '../fixtures/operations';
import { answerApi, failure, type ApiAnswer, type ApiCall } from './api';
import { signInWith, type OpenOptions } from './flow';

const NOT_FOUND = 404;
const ACCEPTED = 202;

export const FLAG_PATH = `/app/operator/trees/3091/flags/${FLAG_ID}`;

export type Scene = {
  profile?: MeProfile;
  /** The page path under `/app/operator/trees/…`; the flag's own by default. */
  path?: string;
  /** `GET …/flags/:flagId`, as each read finds it. */
  flag?: () => Json | ApiAnswer;
  /** The answer to each resolve, by how many came before. */
  resolve?: (call: ApiCall, before: number) => ApiAnswer;
  job?: () => Json;
};

export type Visit = { page: Page; calls: ApiCall[]; resolves: ApiCall[] };

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

const asAnswer = (value: Json | ApiAnswer): ApiAnswer =>
  typeof (value as ApiAnswer).status === 'number' || 'body' in value
    ? (value as ApiAnswer)
    : { body: value };

const responderOf =
  (scene: Scene, resolves: ApiCall[]) =>
  (call: ApiCall): ApiAnswer => {
    const reads: Record<string, () => ApiAnswer> = {
      '/me': () => ({ fallback: true }),
      '/operator/trees/3091/flags/1f6c2a9e-4b7d-4e15-9a3c-8d2e5f0b7a61': () =>
        asAnswer(scene.flag?.() ?? FLAG_OPEN),
      [`/jobs/${RESOLVE_JOB}`]: () => ({ body: scene.job?.() ?? job('resolve_flag', 'sent') }),
    };

    if (call.path !== `/operator/flags/${FLAG_ID}/resolve`) {
      return reads[call.path]?.() ?? failure(NOT_FOUND, 'not_found');
    }

    resolves.push(call);

    return (
      scene.resolve?.(call, resolves.length - 1) ?? {
        status: ACCEPTED,
        body: job('resolve_flag', 'pending'),
      }
    );
  };

/** Signs in and presses "Continue" to the flag page (the page itself is for the spec to wait for). */
export const openFlag = async (open: Open, scene: Scene = {}): Promise<Visit> => {
  const { page } = await open({ row: 'S29' });
  const resolves: ApiCall[] = [];
  const path = scene.path ?? FLAG_PATH;
  let calls: ApiCall[] = [];

  await signInWith(page, meBody(scene.profile ?? OPERATOR), {
    returnTo: path,
    setup: async () => {
      calls = await answerApi(page, responderOf(scene, resolves));
    },
  });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await page.waitForURL(`**${path}`);

  return { page, calls, resolves };
};
