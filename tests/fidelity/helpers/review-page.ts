// The browser side of the S28 spec: the operator signs in through the real Privy test account, `/app/operator/submissions/:id`
// opens, and the evidence, the review write and the job are answered by the spec (the backend does not run).
import type { Page } from '@playwright/test';
import { meBody, type MeProfile } from '../fixtures/accounts';
import type { Json } from '../fixtures/campaigns';
import { FIXTURE_A, OPERATOR } from '../fixtures/evidence';
import { JOB, job } from '../fixtures/operations';
import { HELD } from '../fixtures/record';
import { answerApi, failure, type ApiAnswer, type ApiCall } from './api';
import { signInWith, type OpenOptions } from './flow';

const NOT_FOUND = 404;
const ACCEPTED = 202;

export { HELD };

export type Scene = {
  profile?: MeProfile;
  id?: string;
  /** `GET /evidence/:id`, as each read finds it. */
  evidence?: () => Json | ApiAnswer;
  /** The answer to each review, by how many came before. */
  review?: (call: ApiCall, before: number) => ApiAnswer;
  job?: () => Json;
};

export type Visit = { page: Page; calls: ApiCall[]; reviews: ApiCall[] };

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

const asAnswer = (value: Json | ApiAnswer): ApiAnswer =>
  typeof (value as ApiAnswer).status === 'number' || 'body' in value
    ? (value as ApiAnswer)
    : { body: value };

const responderOf = (scene: Scene, reviews: ApiCall[]) => {
  const id = scene.id ?? HELD;

  return (call: ApiCall): ApiAnswer => {
    const reads: Record<string, () => ApiAnswer> = {
      '/me': () => ({ fallback: true }),
      [`/evidence/${id}`]: () => asAnswer(scene.evidence?.() ?? FIXTURE_A),
      [`/jobs/${JOB}`]: () => ({ body: scene.job?.() ?? job('score', 'pending') }),
    };

    if (call.path !== `/operator/submissions/${id}/review`) {
      return reads[call.path]?.() ?? failure(NOT_FOUND, 'not_found');
    }

    reviews.push(call);

    return (
      scene.review?.(call, reviews.length - 1) ?? {
        status: ACCEPTED,
        body: job('attest', 'pending'),
      }
    );
  };
};

/** Signs in and presses "Continue" to the submission's review page (the page itself is for the spec to wait for). */
export const openReview = async (open: Open, scene: Scene = {}): Promise<Visit> => {
  const { page } = await open({ row: 'S28' });
  const reviews: ApiCall[] = [];
  const path = `/app/operator/submissions/${scene.id ?? HELD}`;
  let calls: ApiCall[] = [];

  await signInWith(page, meBody(scene.profile ?? OPERATOR), {
    returnTo: path,
    setup: async () => {
      calls = await answerApi(page, responderOf(scene, reviews));
    },
  });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await page.waitForURL(`**${path}`);

  return { page, calls, reviews };
};
