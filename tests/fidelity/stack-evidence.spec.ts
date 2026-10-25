// Phase T, the evidence half that needs the whole local stack (phases.md T): a clip recorded in the app reaches `onchain`
// through the B2 worker, and a clip recorded offline survives a reload and is still sendable inside its 72 h (NFR-020).
// Nothing here is stubbed: the real Privy test account signs in, the real API, PostgreSQL, MinIO, the worker and anvil answer.
// Start the stack first (backend/README.md: `docker compose up -d`, `pnpm db:migrate`, `pnpm start`, `pnpm worker`); the
// spec fails by name when a piece is missing. The camera is Chromium's fake device and the GPS is the campaign's own centre.
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { chainOf } from './helpers/chain';
import { goInApp, signInWith } from './helpers/flow';
import { requireStack, sql, waitFor } from './helpers/stack';

const TEST_MS = 240_000;
const CHAIN_MS = 120_000;
const SLOTS_NEEDED = 2;
const FILM_MS = 15_000;
/** The centre of the campaign's region (geohash qqguwvt, Jakarta); the region is 2.5 km wide. */
const FIX = { latitude: -6.209335, longitude: 106.827621, accuracy: 8 };
const FUNDING = 20_000_000n;
const ONCHAIN = 'Recorded on-chain. The milestone counts.';

test.describe.configure({ mode: 'serial', timeout: TEST_MS });

type Slot = { campaign: string; slotId: string };

const contexts: BrowserContext[] = [];
let slots: Slot[] = [];

/** Signs in with the real Privy test account and presses "Continue": a phone with a session, at `returnTo`. */
const phone = async (browser: Browser, returnTo: string): Promise<Page> => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    geolocation: FIX,
    permissions: ['geolocation'],
    timezoneId: 'Asia/Jakarta',
    locale: 'en-GB',
  });
  const page = await context.newPage();

  contexts.push(context);
  await signInWith(page, undefined, { returnTo });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await page.waitForURL(`**${returnTo}`);

  return page;
};

const walletOf = (): string => sql('select wallet_address from public.profiles')[0]?.[0] ?? '';

/** The planter's claimed slots that have no tree yet. */
const freeSlots = (): Slot[] =>
  sql(`select campaign_address, slot_id from public.slots
    where lower(planter_address) = lower('${walletOf()}') and status = 'claimed' and tree_id is null
    order by claimed_at, slot_id`).map(([campaign = '', slotId = '']) => ({ campaign, slotId }));

/** An active campaign on anvil, mirrored by the indexer, with `SLOTS_NEEDED` slots claimed for the planter by the relayer. */
const claimSlots = async (): Promise<void> => {
  const chain = chainOf();
  const campaign = (
    await chain.createCampaign({ fundingTarget: FUNDING, treeTarget: 10 })
  ).toLowerCase();

  await chain.contributeFrom(campaign as `0x${string}`, FUNDING);
  await waitFor(
    'the campaign to be mirrored active',
    () =>
      sql(`select 1 from public.campaigns where address = '${campaign}' and status = 'active'`)[0],
  );
  sql(`insert into public.relayer_jobs (kind, payload) values ('claim',
    '{"campaign":"${campaign}","planter":"${walletOf()}","count":${SLOTS_NEEDED}}'::jsonb)`);
  await waitFor('the claimed slots', () =>
    freeSlots().filter((slot) => slot.campaign === campaign).length >= SLOTS_NEEDED
      ? true
      : undefined,
  );
};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(TEST_MS);
  await requireStack();
  // the first sign-in makes the profile; the spec then makes it a planter and frees the device quota
  await phone(browser, '/app');
  sql(`update public.profiles set role = 'planter', carbon_rights_agreement_hash = '0x${'ab'.repeat(32)}',
    carbon_rights_accepted_at = now()`);
  sql('update public.devices set revoked_at = now() where revoked_at is null');

  if (freeSlots().length < SLOTS_NEEDED) {
    await claimSlots();
  }

  slots = freeSlots();
});

test.afterAll(async () => {
  await Promise.all(contexts.map((context) => context.close()));
});

const registerDevice = async (page: Page): Promise<void> => {
  await goInApp(page, '/app/planter/device');
  await page.getByRole('button', { name: 'Register this device' }).click();
  await expect(page.getByText('Signing key', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revoke this device' })).toBeVisible();
};

/** Opens the recorder on a slot and films `FILM_MS` of the fake camera, ending on the sealed review. */
const film = async (page: Page, slot: Slot): Promise<void> => {
  await goInApp(
    page,
    `/app/planter/record?campaign=${slot.campaign}&slot=${slot.slotId}&kind=PLANTED`,
  );
  await page.getByRole('button', { name: 'Open camera & GPS' }).click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  // Stop counts down the 5 s minimum, so it enables when the clip may end
  await expect(page.getByRole('button', { name: 'Stop recording' })).toBeEnabled({
    timeout: FILM_MS,
  });
  await page.getByRole('button', { name: 'Stop recording' }).click();
  await expect(page.getByRole('heading', { name: 'Sealed on this device' })).toBeVisible();
};

const submissions = (status: string): number =>
  sql(`select 1 from public.submissions where status = '${status}'`).length;

test('a clip recorded in the app is scored by the worker and lands on the chain', async ({
  browser,
}) => {
  const [slot] = slots;
  const page = await phone(browser, '/app/planter/device');
  const before = submissions('onchain');

  await registerDevice(page);
  await film(page, slot as Slot);
  await page.getByRole('button', { name: 'Upload now' }).click();
  await page.waitForURL('**/app/evidence/**');
  await expect(page.getByText(ONCHAIN)).toBeVisible({ timeout: CHAIN_MS });
  expect(submissions('onchain')).toBe(before + 1);
  await waitFor(
    'the planted tree',
    () =>
      sql(
        `select 1 from public.trees where campaign_address = '${(slot as Slot).campaign}' and slot_id = ${(slot as Slot).slotId}`,
      )[0],
  );
});

/** Films the slot with the network off and saves the clip to the queue. */
const saveOffline = async (page: Page, slot: Slot): Promise<void> => {
  // the dev server serves each screen as a chunk on demand: load the uploads screen now, the build precaches it
  await goInApp(page, '/app/planter/uploads');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await goInApp(
    page,
    `/app/planter/record?campaign=${slot.campaign}&slot=${slot.slotId}&kind=PLANTED`,
  );
  await expect(page.getByRole('button', { name: 'Open camera & GPS' })).toBeVisible();
  await page.context().setOffline(true);
  await film(page, slot);
  await page.getByRole('button', { name: 'Save offline' }).click();
  await page.waitForURL('**/app/planter/uploads');
  await expect(page.getByText('Saved on this device. Upload within 72 hours.')).toBeVisible();
};

/** Back online and reloaded: the session is gone (D-7), the clip and the signing key are not. */
const reloadAndSignIn = async (page: Page): Promise<void> => {
  await page.context().setOffline(false);
  await page.reload();
  await signInWith(page, undefined, { returnTo: '/app/planter/uploads' });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await page.waitForURL('**/app/planter/uploads');
};

test('a clip recorded offline survives a reload and is still sendable within 72 hours', async ({
  browser,
}) => {
  const slot = slots[1] as Slot;
  const page = await phone(browser, '/app/planter/device');
  const before = submissions('onchain');

  await registerDevice(page);
  await saveOffline(page, slot);
  await reloadAndSignIn(page);

  const send = page.getByRole('button', { name: 'Upload now' });

  await expect(send).toBeEnabled();
  await send.click();
  // S20 stays put and marks the card sent; its link opens the evidence the worker then writes to the chain
  await expect(page.getByText('All sent')).toBeVisible();
  await page.locator('a[href^="/app/evidence/"]').first().click();
  await expect(page.getByText(ONCHAIN)).toBeVisible({ timeout: CHAIN_MS });
  expect(submissions('onchain')).toBe(before + 1);
});
