// docs/FE/features/s04-campaign.md §7, D06 Claim slots: #26-#31. A planter signs in through the real Privy test account;
// `GET /campaigns/:address`, `POST /campaigns/:address/claims` and `GET /jobs/:id` are answered by the spec (the backend
// does not run). D06 is a gasless job: no wallet and no chain are involved.
import type { Page } from '@playwright/test';
import { SARI, meBody } from './fixtures/accounts';
import { DEMAK_DETAIL, ROOTS_DETAIL, campaignBody, type Json } from './fixtures/campaigns';
import { claim } from './fixtures/job';
import { answerApi, failure, type ApiAnswer, type ApiCall } from './helpers/api';
import { expect, signInWith, test, type OpenOptions } from './helpers/flow';

const TEST_MS = 120_000;
const ACCEPTED = 202;
const HTTP_OK = 200;
const CONFLICT = 409;
const UNAVAILABLE = 503;
const JOB_ID = '3b1e0c8a-6f2d-4a9b-8c7e-1d5f4a2b9e60';

test.describe.configure({ timeout: TEST_MS });

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

/** Sari as the campaign answer sees her: a planter with a wallet and a claim to make. */
const planter = (remainingCap: number, queuedJobId: string | null = null): Json => ({
  role: 'planter',
  walletAddress: SARI.walletAddress,
  contributedAmount: '0',
  refundedAmount: '0',
  claim: { remainingCap, queuedJobId },
});

type Scene = {
  campaign: Json;
  viewer: Json;
  /** The answer to each `POST …/claims`, by how many came before. */
  post?: (before: number) => ApiAnswer;
};

type Visit = { page: Page; posts: ApiCall[] };

const visit = async (open: Open, { campaign, viewer, post }: Scene): Promise<Visit> => {
  const { page } = await open({ row: 'S04' });
  const address = String(campaign.address);
  const posts: ApiCall[] = [];
  const path = `/campaigns/${address}`;

  await signInWith(page, meBody(SARI), {
    returnTo: path,
    setup: async () => {
      await answerApi(page, (call) => {
        if (call.path === '/me') {
          return { fallback: true };
        }

        if (call.path === `${path}/claims`) {
          posts.push(call);

          return (
            post?.(posts.length - 1) ?? {
              status: ACCEPTED,
              body: claim({ id: JOB_ID, status: 'queued' }),
            }
          );
        }

        if (call.path === `/jobs/${JOB_ID}`) {
          return { body: claim({ id: JOB_ID, status: 'queued' }) };
        }

        return call.path === path
          ? { body: campaignBody(campaign, viewer) }
          : failure(404, 'not_found');
      });
    },
  });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await page.waitForURL(`**${path}`);
  await expect(page.locator('#campaign-actions')).toBeVisible();

  return { page, posts };
};

const actions = (page: Page) => page.locator('#campaign-actions');

const count = (page: Page) => actions(page).getByLabel(/^Slots to claim/u);

const trigger = (page: Page) =>
  actions(page).getByRole('button', { name: 'Claim slots', exact: true });

const review = (page: Page) => page.getByRole('region', { name: 'Review Claim slots' });

const send = async (page: Page, slots: string): Promise<void> => {
  await count(page).fill(slots);
  await trigger(page).click();
  await review(page).getByRole('button', { name: 'Confirm' }).click();
};

test('#26 four slots are over a remaining cap of three, so "Claim slots" stays disabled; three enables it', async ({
  open,
}) => {
  const { page } = await visit(open, { campaign: ROOTS_DETAIL, viewer: planter(3) });

  await count(page).fill('4');
  await expect(trigger(page)).toBeDisabled();
  await count(page).fill('3');
  await expect(trigger(page)).toBeEnabled();
});

test('#27 (S8 pattern 32) on a campaign still funding the facts read the limits, the claim deadline is closed and the button is off', async ({
  open,
}) => {
  const { page } = await visit(open, { campaign: DEMAK_DETAIL, viewer: planter(49) });

  await expect(actions(page).getByText('Available open slots').locator('..')).toContainText('750');
  await expect(actions(page).getByText('Remaining cap').locator('..')).toContainText('49');
  await expect(actions(page).getByText('Claim deadline').locator('..')).toContainText('Closed');
  await expect(trigger(page)).toBeDisabled();
  await expect(actions(page)).toContainText('Campaign must be Active.');
});

test('#28 confirming two slots sends one claim with a d06- key, then offers the job', async ({
  open,
}) => {
  const { page, posts } = await visit(open, { campaign: ROOTS_DETAIL, viewer: planter(3) });

  await send(page, '2');
  await expect(actions(page)).toContainText(
    'Done. Claim slots is on its way; its status updates here.',
  );
  await expect(actions(page).getByRole('link', { name: 'Track job' })).toHaveAttribute(
    'href',
    `/app/jobs/${JOB_ID}`,
  );
  expect(posts).toHaveLength(1);
  expect(posts[0]?.body).toEqual({ count: 2 });
  expect(posts[0]?.headers['idempotency-key']).toMatch(/^d06-/u);
});

test('#29 a failed request is sent again with the same Idempotency-Key and ends with one job link', async ({
  open,
}) => {
  const { page, posts } = await visit(open, {
    campaign: ROOTS_DETAIL,
    viewer: planter(3),
    post: (before) =>
      before === 0
        ? failure(UNAVAILABLE, 'service_unavailable')
        : {
            status: HTTP_OK,
            body: { ...claim({ id: JOB_ID, status: 'queued' }), idempotent: true },
          },
  });

  await send(page, '2');
  await expect(review(page).getByRole('alert')).toBeVisible();
  await review(page).getByRole('button', { name: 'Confirm' }).click();
  await expect(actions(page).getByRole('link', { name: 'Track job' })).toHaveCount(1);
  expect(posts).toHaveLength(2);
  expect(posts[1]?.headers['idempotency-key']).toBe(posts[0]?.headers['idempotency-key']);
});

test('#30 a cap exceeded updates the remaining cap and puts the sentence under the field', async ({
  open,
}) => {
  const { page } = await visit(open, {
    campaign: ROOTS_DETAIL,
    viewer: planter(49),
    post: () => ({
      status: CONFLICT,
      body: {
        error: {
          code: 'planter_cap_exceeded',
          message: 'planter_cap_exceeded',
          details: { remaining: 3, cap: 50 },
        },
      },
    }),
  });

  await send(page, '4');
  await expect(actions(page).getByText('Remaining cap').locator('..')).toContainText('3');
  await expect(actions(page)).toContainText('You can claim at most 3 more slots in this campaign');
  await expect(count(page)).toHaveAttribute('aria-invalid', 'true');
});

test('#31 while a claim job is queued the button stays disabled', async ({ open }) => {
  const { page } = await visit(open, { campaign: ROOTS_DETAIL, viewer: planter(3, JOB_ID) });

  await count(page).fill('1');
  await expect(trigger(page)).toBeDisabled();
});
