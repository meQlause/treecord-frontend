// docs/FE/features/s11-profile.md §7: one test per criterion PF-AC1..PF-AC19, asserting its Then column under the
// fidelity.md §2 conditions. Sign-in uses the real Privy test account (backend/.env); `GET /me` follows the profile the
// spec holds and `POST /profile` is answered with the accounts.md §2 bodies (the backend does not run). D-7: a reload
// forgets the login, so a spec moves inside the app (goInApp) wherever the criterion says "reloads".
import type { Page } from '@playwright/test';
import { FIRST_SIGN_IN, SARI, meBody, type MeProfile } from './fixtures/accounts';
import {
  expect,
  goInApp,
  refocus,
  sessionEmail,
  signInWith,
  test,
  type OpenOptions,
} from './helpers/flow';
import {
  answerProfile,
  meFollows,
  refused,
  type MeState,
  type ProfileAnswer,
  type ProfileResponder,
} from './helpers/profile';
import { VIEWPORTS } from './matrix';

const ROW = 'S11';
const WIDE = VIEWPORTS[1];
const WALLET = '0x71c7656ec7ab88b098defb751b7401b5f6d8976f';
const ALEX: MeProfile = {
  ...SARI,
  role: 'donor',
  displayName: 'Alex',
  walletAddress: WALLET,
  isBuyer: false,
  carbonRightsAgreementAccepted: false,
  carbonRightsAcceptedAt: null,
};
const ALEX_ACCEPTED: MeProfile = { ...ALEX, carbonRightsAgreementAccepted: true };
const RAKA: MeProfile = { ...ALEX, role: 'operator', displayName: 'Raka' };
const NAME_FIELD = 'Display name';
const SAVE = 'Save profile';
const BECOME = 'Become a planter';
const CONFIRM = 'Confirm';
const AGREEMENT = /I accept the planter agreement \(version 1\)/;
const HOLD_MS = 1000;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAVAILABLE = 503;
const TEST_MS = 120_000;

test.describe.configure({ timeout: TEST_MS });

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

type Session = { page: Page; account: MeState; posts: unknown[] };

/** Signs in as `profile` and lands on `/app/profile`; `post` answers `POST /profile`. */
const openProfile = async (
  open: Open,
  profile: MeProfile,
  post: ProfileResponder = () => refused(HTTP_UNAVAILABLE, 'service_unavailable'),
): Promise<Session> => {
  const { page } = await open({ row: ROW, viewport: WIDE });
  const account: MeState = { current: profile };
  const posts: unknown[] = [];

  await signInWith(page, meBody(profile), {
    returnTo: '/app/profile',
    setup: async (target) => {
      await meFollows(target, account);
      await answerProfile(target, post, posts);
    },
  });
  await page.getByRole('button', { name: /^Continue to/ }).click();
  await page.waitForURL('**/app/profile');

  return { page, account, posts };
};

const saved = (profile: MeProfile, changes: Partial<MeProfile>): ProfileAnswer => ({
  body: meBody(profile, changes),
});

const heading = (page: Page) => page.getByTestId('pf-heading');

const field = (page: Page) => page.getByLabel(NAME_FIELD);

const menu = (page: Page) => page.locator('summary[aria-label^="Account:"]');

const review = (page: Page) => page.getByRole('region', { name: /^Review / });

const fact = (page: Page, label: string) =>
  page.locator('.ws-facts > div').filter({ has: page.getByText(label, { exact: true }) });

const toast = (page: Page) => page.locator('.toast-area');

/** Posts must be counted by what the spec's route saw: bodies in order, as the browser sent them. */
const bodiesOf = (session: Session) => session.posts;

test('PF-AC1 Sari sees her planter profile: role, email, address, agreement, device link and the way back to donor', async ({
  open,
}) => {
  const { page } = await openProfile(open, SARI);

  await expect(page.locator('.page-heading .eyebrow')).toHaveText('PLANTER ACCOUNT');
  await expect(heading(page)).toHaveText('Hello, Sari.');
  await expect(fact(page, 'Role').locator('dd')).toHaveText('Planter');
  await expect(fact(page, 'Email').locator('dd')).toHaveText(sessionEmail());
  await expect(fact(page, 'Address').locator('dd')).toHaveText('0x4b9e…9d0e');
  await expect(fact(page, 'Planter agreement').locator('dd')).toHaveText('Accepted');
  await expect(page.getByRole('link', { name: 'This device' })).toBeVisible();
  await expect(page.getByLabel('Credit buyer preference')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Switch to donor' })).toBeVisible();
});

test('PF-AC2 clearing the name disables "Save profile"', async ({ open }) => {
  const { page } = await openProfile(open, ALEX);

  await field(page).fill('');

  await expect(page.getByRole('button', { name: SAVE })).toBeDisabled();
});

test('PF-AC3 saving "  Alex Tan  " sends the trimmed name, shows it at once in the menu and toasts "Profile saved"', async ({
  open,
}) => {
  const session = await openProfile(open, ALEX, () => ({
    ...saved(ALEX, { displayName: 'Alex Tan' }),
    after: new Promise((resolve) => setTimeout(resolve, HOLD_MS)),
  }));
  const { page } = session;

  await field(page).fill('  Alex Tan  ');
  await page.getByRole('button', { name: SAVE }).click();

  await expect(menu(page)).toHaveAttribute('aria-label', 'Account: Alex Tan, Donor');
  await expect(toast(page)).toContainText('Profile saved');
  expect(bodiesOf(session)).toEqual([{ displayName: 'Alex Tan' }]);
});

test('PF-AC4 a field error keeps the typed name, links the alert to the field and takes the menu back to "Alex"', async ({
  open,
}) => {
  const detail = [{ path: 'displayName', message: 'rejected' }];
  const { page } = await openProfile(open, ALEX, () =>
    refused(HTTP_BAD_REQUEST, 'validation_error', detail),
  );

  await field(page).fill('Alex Tan');
  await page.getByRole('button', { name: SAVE }).click();

  await expect(field(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(field(page)).toHaveValue('Alex Tan');
  await expect(
    page.locator(`#${(await field(page).getAttribute('aria-describedby')) ?? ''}`),
  ).toHaveAttribute('role', 'alert');
  await expect(menu(page)).toHaveAttribute('aria-label', 'Account: Alex, Donor');
});

test('PF-AC5 an unavailable server rolls the menu back, keeps the typed name and says "Could not load this page"', async ({
  open,
}) => {
  const { page } = await openProfile(open, ALEX);

  await field(page).fill('Alex Tan');
  await page.getByRole('button', { name: SAVE }).click();

  await expect(page.locator('.pf-foot').getByRole('alert')).toContainText(
    'Could not load this page',
  );
  await expect(menu(page)).toHaveAttribute('aria-label', 'Account: Alex, Donor');
  await expect(field(page)).toHaveValue('Alex Tan');
});

test('PF-AC6 ticking "Credit buyer preference" sends only isBuyer and the box stays ticked once saved', async ({
  open,
}) => {
  const session = await openProfile(open, ALEX, () => saved(ALEX, { isBuyer: true }));
  const { page } = session;

  await page.getByLabel('Credit buyer preference').check();
  await page.getByRole('button', { name: SAVE }).click();

  await expect(toast(page)).toContainText('Profile saved');
  await expect(page.getByLabel('Credit buyer preference')).toBeChecked();
  expect(bodiesOf(session)).toEqual([{ isBuyer: true }]);
});

test('PF-AC7 a typed name survives leaving the page and coming back, and goes with the sign-out', async ({
  open,
}) => {
  const { page } = await openProfile(open, ALEX);

  await field(page).fill('Alex T');
  await goInApp(page, '/app/donor');
  await goInApp(page, '/app/profile');
  await expect(field(page)).toHaveValue('Alex T');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/campaigns$/);
  await signInWith(page, meBody(ALEX), { returnTo: '/app/profile' });
  await page.getByRole('button', { name: /^Continue to/ }).click();
  await expect(field(page)).toHaveValue('Alex');
});

test('PF-AC8 "Become a planter" without an earlier acceptance asks for the agreement and holds "Confirm"', async ({
  open,
}) => {
  const { page } = await openProfile(open, ALEX);

  await page.getByRole('button', { name: BECOME }).click();

  await expect(page.getByLabel(AGREEMENT)).toBeVisible();
  await expect(review(page).getByRole('button', { name: CONFIRM })).toBeDisabled();
});

test('PF-AC9 accepting the agreement sends role and acceptance, toasts, moves to My trees and records "Accepted"', async ({
  open,
}) => {
  const planter = { role: 'planter', carbonRightsAgreementAccepted: true } as const;
  const session = await openProfile(open, ALEX, () => saved(ALEX, planter));
  const { page, account } = session;

  await page.getByRole('button', { name: BECOME }).click();
  await page.getByLabel(AGREEMENT).check();
  account.current = { ...ALEX, ...planter };
  await review(page).getByRole('button', { name: CONFIRM }).click();

  await expect(toast(page)).toContainText('You are now a planter');
  await expect(page).toHaveURL(/\/app\/planter\/trees$/);

  for (const label of ['My trees', 'Slots', 'Campaigns', 'Challenges', 'Uploads']) {
    await expect(page.getByRole('link', { name: label, exact: true }).first()).toBeVisible();
  }

  expect(bodiesOf(session)).toEqual([{ role: 'planter', carbonRightsAgreementAccepted: true }]);
  await goInApp(page, '/app/profile');
  await expect(fact(page, 'Planter agreement').locator('dd')).toHaveText('Accepted');
});

test('PF-AC10 an earlier acceptance needs no checkbox, and "Confirm" sends only the role', async ({
  open,
}) => {
  const session = await openProfile(open, ALEX_ACCEPTED, () =>
    saved(ALEX_ACCEPTED, { role: 'planter' }),
  );
  const { page } = session;

  await page.getByRole('button', { name: BECOME }).click();

  await expect(review(page)).toContainText(
    'You accepted the planter agreement earlier. Your workspace changes to My trees.',
  );
  await expect(page.getByLabel(AGREEMENT)).toHaveCount(0);
  await review(page).getByRole('button', { name: CONFIRM }).click();
  await expect.poll(() => bodiesOf(session)).toEqual([{ role: 'planter' }]);
});

test('PF-AC11 "agreement_required" opens the checkbox in the review and keeps the role', async ({
  open,
}) => {
  const { page } = await openProfile(open, ALEX_ACCEPTED, () =>
    refused(HTTP_BAD_REQUEST, 'agreement_required'),
  );

  await page.getByRole('button', { name: BECOME }).click();
  await review(page).getByRole('button', { name: CONFIRM }).click();

  await expect(page.getByLabel(AGREEMENT)).toBeVisible();
  await expect(review(page).getByRole('alert')).toBeVisible();
  await expect(fact(page, 'Role').locator('dd')).toHaveText('Donor');
  await expect(page).toHaveURL(/\/app\/profile$/);
});

test('PF-AC12 an operator sees the role and no way to switch it and no buyer box', async ({
  open,
}) => {
  const { page } = await openProfile(open, RAKA);

  await expect(fact(page, 'Role').locator('dd')).toHaveText('Operator');
  await expect(page.getByRole('button', { name: BECOME })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Switch to donor' })).toHaveCount(0);
  await expect(page.getByLabel('Credit buyer preference')).toHaveCount(0);
});

test('PF-AC13 Sari switching to donor sends the role, toasts and moves to Donor home', async ({
  open,
}) => {
  const session = await openProfile(open, SARI, () => saved(SARI, { role: 'donor' }));
  const { page, account } = session;

  await page.getByRole('button', { name: 'Switch to donor' }).click();
  account.current = { ...SARI, role: 'donor' };
  await review(page).getByRole('button', { name: CONFIRM }).click();

  await expect(toast(page)).toContainText('You are now a donor');
  await expect(page).toHaveURL(/\/app\/donor$/);
  expect(bodiesOf(session)).toEqual([{ role: 'donor' }]);
});

test('PF-AC14 "Cancel" closes an open review and sends nothing', async ({ open }) => {
  const session = await openProfile(open, ALEX);
  const { page } = session;

  await page.getByRole('button', { name: BECOME }).click();
  await expect(review(page)).toBeVisible();
  await review(page).getByRole('button', { name: 'Cancel' }).click();

  await expect(review(page)).toHaveCount(0);
  expect(bodiesOf(session)).toEqual([]);
});

test('PF-AC15 "Copy wallet" puts the full address on the clipboard and toasts "Wallet address copied"', async ({
  open,
}) => {
  const { page } = await openProfile(open, ALEX);

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy wallet' }).click();

  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(WALLET);
  await expect(toast(page)).toContainText('Wallet address copied');
});

test('PF-AC16 a refused clipboard raises the error toast "Copy unavailable. Select the address above."', async ({
  open,
}) => {
  const { page } = await openProfile(open, ALEX);

  await page.evaluate(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error('denied'));
  });
  await page.getByRole('button', { name: 'Copy wallet' }).click();

  await expect(page.locator('.toast-error')).toContainText(
    'Copy unavailable. Select the address above.',
  );
});

test('PF-AC17 a session whose wallet is gone closes the workspace: back to sign-in, wallet still being prepared (SI-13)', async ({
  open,
}) => {
  const { page, account } = await openProfile(open, ALEX);

  account.current = { ...FIRST_SIGN_IN, id: ALEX.id };
  await refocus(page);

  await expect(page).toHaveURL(/\/sign-in/u);
  await expect(
    page.getByText('Your wallet is still being prepared. Try again in a moment.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy wallet' })).toHaveCount(0);
});

test('PF-AC18 "Sign out" in the Wallet panel goes to /campaigns, toasts and shows "Sign in"', async ({
  open,
}) => {
  const { page } = await openProfile(open, SARI);

  await page.getByRole('button', { name: 'Sign out' }).click();

  await expect(page).toHaveURL(/\/campaigns$/);
  await expect(toast(page)).toContainText('Signed out');
  await expect(page.getByRole('banner').getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('PF-AC19 the document title is "Profile · Treecord"', async ({ open }) => {
  const { page } = await openProfile(open, SARI);

  await expect(page).toHaveTitle('Profile · Treecord');
});
