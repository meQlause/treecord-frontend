// docs/FE/features/s22-device.md §7: one test per criterion #1..#12, in the browser, under the docs/FE/fidelity.md §2
// conditions. Sign-in uses the real Privy test account (backend/.env); `GET /me` follows the profile the spec holds, the
// three device endpoints are answered with the devices.md bodies (the backend does not run), and this phone's IndexedDB
// is seeded before the app loads and read after it ran. WebCrypto and IndexedDB are the browser's own.
// F3b: the last words of #10 — S19 refusing to open the camera once the key is gone — are asserted with S19 itself.
import type { Page } from '@playwright/test';
import { SARI } from './fixtures/accounts';
import type { Json } from './fixtures/campaigns';
import { DEVICE, DEVICE_ID, THUMBPRINT, devicesOf, registered } from './fixtures/device';
import {
  answerDevices,
  readKey,
  seedDevice,
  type DeviceAnswer,
  type DeviceCall,
  type DeviceResponder,
  type SeededKey,
} from './helpers/device';
import { expect, test, type OpenOptions } from './helpers/flow';
import { openSignedIn } from './helpers/signed-in';

const ROW = 'S22';
const PATH = '/app/planter/device';
const HTTP_CONFLICT = 409;
const HTTP_UNAVAILABLE = 503;
const TEST_MS = 120_000;
const LOST =
  'This account lists a registered device, but this browser has no key (site data cleared or another browser). Register again; the old key cannot be recovered.';
const REVIEW =
  'The server stops accepting this device’s signatures and the key is deleted from this browser. Evidence it already signed stays valid and is never re-signed.';
const KEY: SeededKey = {
  thumbprint: THUMBPRINT,
  deviceId: DEVICE_ID,
  label: 'Pixel 8',
  createdAt: '2026-10-23T03:20:15.067Z',
};
const REFUSED = (code: string, details?: Json): DeviceAnswer => ({
  status: HTTP_CONFLICT,
  body: { error: { code, message: code, ...(details === undefined ? {} : { details }) } },
});

test.describe.configure({ timeout: TEST_MS });

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

type Setup = {
  list?: Json[];
  key?: SeededKey;
  rows?: number;
  post?: DeviceAnswer;
  remove?: DeviceAnswer;
};

type Opened = { page: Page; calls: DeviceCall[] };

const OK_BELOW = 300;

/** The device server of `setup`: a 201 makes the device it lists afterwards, a 200 revoke empties the list. */
const serverOf = (setup: Setup): DeviceResponder => {
  let devices = [...(setup.list ?? [])];

  return ({ method }) => {
    if (method === 'GET') {
      return { body: devicesOf(devices) };
    }

    const answer =
      method === 'POST'
        ? (setup.post ?? { status: 201, body: registered() })
        : (setup.remove ?? { body: { idempotent: false } });

    if ((answer.status ?? 200) < OK_BELOW) {
      devices = method === 'POST' ? [...devices, DEVICE] : [];
    }

    return answer;
  };
};

/** Signs in as Sari and opens S22 with `list` as her active devices and `setup.key` as the key this phone holds. */
const openDevice = async (open: Open, setup: Setup = {}): Promise<Opened> => {
  const calls: DeviceCall[] = [];
  const { page } = await openSignedIn(
    open,
    { row: ROW, profile: SARI, path: PATH },
    async (target) => {
      const rows = Array.from({ length: setup.rows ?? 0 }, () => ({
        profileId: SARI.id,
        payload: { deviceKey: THUMBPRINT },
      }));

      await seedDevice(target, SARI.id, {
        ...(setup.key === undefined ? {} : { key: setup.key }),
        rows,
      });
      await answerDevices(target, serverOf(setup), calls);
    },
  );

  return { page, calls };
};

const card = (page: Page) => page.locator('svg.wc-card[role="img"]').first();

const flow = (page: Page) => page.locator('svg.pf-flow');

const labelField = (page: Page) => page.getByLabel('Device label');

const fact = (page: Page, label: string) =>
  page.locator('.ws-facts > div').filter({ has: page.getByText(label, { exact: true }) });

const alert = (page: Page) => page.getByRole('alert');

const review = (page: Page) => page.getByRole('region', { name: /^Review / });

test('#1 with no device and no key the card says "NO KEY YET", the label is prefilled and the flow needs a key', async ({
  open,
}) => {
  const { page } = await openDevice(open);

  await expect(card(page)).toContainText('NO KEY YET');
  await expect(fact(page, 'Private key').locator('dd')).toHaveText('None on this browser');
  await expect(labelField(page)).toHaveValue('This browser');
  await expect(flow(page)).toContainText('NEEDS A KEY');
});

test('#2 registering shows "Creating key…", sends only the four public members and a label, and keeps a key that cannot be exported', async ({
  open,
}) => {
  const { page, calls } = await openDevice(open);

  await labelField(page).fill('Pixel 8');
  await page.getByRole('button', { name: 'Register this device' }).click();

  await expect(page.getByRole('button', { name: 'Creating key…' })).toBeDisabled();
  await expect.poll(() => calls.filter(({ method }) => method === 'POST').length).toBe(1);
  const body = calls.find(({ method }) => method === 'POST')?.body as {
    publicKeyJwk: Record<string, string>;
    label: string;
  };

  expect(Object.keys(body.publicKeyJwk).sort()).toEqual(['crv', 'kty', 'x', 'y']);
  expect(body.label).toBe('Pixel 8');
  await expect.poll(async () => (await readKey(page, SARI.id))?.exportable).toBe(false);
});

test('#3 a 201 shows the ready card, the key id, the toast, and a record with the device id', async ({
  open,
}) => {
  const { page } = await openDevice(open);

  await labelField(page).fill('Pixel 8');
  await page.getByRole('button', { name: 'Register this device' }).click();

  await expect(card(page)).toContainText('SIGNING KEY · P-256');
  await expect(card(page)).toContainText('Pixel 8');
  await expect(card(page)).toContainText('READY');
  await expect(card(page)).toContainText('CREATED 23 OCT 2026');
  await expect(fact(page, 'Key ID').locator('dd')).toHaveText('x3Jd9kQpT2aB…');
  await expect(page.locator('.toast-area')).toContainText('This device can now sign evidence');
  expect((await readKey(page, SARI.id))?.deviceId).toBe(DEVICE_ID);
});

test('#4 a full device list shows its alert, keeps no key and leaves the card on "NO KEY YET"', async ({
  open,
}) => {
  const { page } = await openDevice(open, { post: REFUSED('device_limit_reached', { max: 3 }) });

  await page.getByRole('button', { name: 'Register this device' }).click();

  await expect(alert(page).locator('[data-copy="COPY-010"]')).toBeVisible();
  expect(await readKey(page, SARI.id)).toBeNull();
  await expect(card(page)).toContainText('NO KEY YET');
});

test('#5 an already registered key shows its alert and keeps no key', async ({ open }) => {
  const { page } = await openDevice(open, { post: REFUSED('device_already_registered') });

  await page.getByRole('button', { name: 'Register this device' }).click();

  await expect(alert(page).locator('[data-copy="COPY-011"]')).toBeVisible();
  expect(await readKey(page, SARI.id)).toBeNull();
});

test('#6 a label of only spaces keeps "Register this device" disabled', async ({ open }) => {
  const { page } = await openDevice(open);

  await labelField(page).fill('   ');

  await expect(page.getByRole('button', { name: 'Register this device' })).toBeDisabled();
});

test('#7 a registered device with no key here reads "KEY MISSING ON THIS BROWSER" and says why', async ({
  open,
}) => {
  const { page } = await openDevice(open, { list: [DEVICE] });

  await expect(card(page)).toContainText('KEY MISSING ON THIS BROWSER');
  await expect(alert(page)).toHaveText(LOST);
});

test('#8 a key that is not in the loaded list is deleted, and the card follows the list', async ({
  open,
}) => {
  const { page } = await openDevice(open, {
    key: { ...KEY, thumbprint: 'a-key-revoked-elsewhere' },
  });

  await expect(card(page)).toContainText('NO KEY YET');
  await expect.poll(() => readKey(page, SARI.id)).toBeNull();
});

test('#9 "Revoke this device" opens its review, and "Cancel" closes it with nothing changed', async ({
  open,
}) => {
  const { page, calls } = await openDevice(open, { list: [DEVICE], key: KEY });

  await page.getByRole('button', { name: 'Revoke this device' }).click();

  await expect(review(page)).toContainText(REVIEW);
  await expect(review(page).getByRole('button', { name: 'Confirm' })).toBeVisible();
  await review(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(review(page)).toHaveCount(0);
  expect(calls.some(({ method }) => method === 'DELETE')).toBe(false);
  expect((await readKey(page, SARI.id))?.deviceId).toBe(DEVICE_ID);
});

test('#10 revoking warns about the queued recordings, deletes the device and the key, and toasts', async ({
  open,
}) => {
  const { page, calls } = await openDevice(open, { list: [DEVICE], key: KEY, rows: 2 });

  await page.getByRole('button', { name: 'Revoke this device' }).click();

  const warning = review(page).locator('[data-copy="COPY-213"]');

  await expect(warning).toBeVisible();
  await expect(review(page).locator('[data-count="2"]')).toBeVisible();
  await review(page).getByRole('button', { name: 'Confirm' }).click();

  await expect(card(page)).toContainText('NO KEY YET');
  await expect(page.locator('.toast-area')).toContainText('Signing key removed from this browser');
  expect(
    calls.some(({ method, path }) => method === 'DELETE' && path === `/devices/${DEVICE_ID}`),
  ).toBe(true);
  expect(await readKey(page, SARI.id)).toBeNull();
});

test('#11 a failed revoke shows its alert in the review and keeps the key', async ({ open }) => {
  const { page } = await openDevice(open, {
    list: [DEVICE],
    key: KEY,
    remove: {
      status: HTTP_UNAVAILABLE,
      body: { error: { code: 'service_unavailable', message: 'x' } },
    },
  });

  await page.getByRole('button', { name: 'Revoke this device' }).click();
  await review(page).getByRole('button', { name: 'Confirm' }).click();

  await expect(review(page).locator('[data-copy="COPY-214"]')).toBeVisible();
  await expect(review(page).getByRole('button', { name: 'Confirm' })).toBeEnabled();
  expect((await readKey(page, SARI.id))?.deviceId).toBe(DEVICE_ID);
});

test('#12 offline, "Register this device" and "Revoke this device" are disabled', async ({
  open,
}) => {
  const fresh = await openDevice(open);

  await expect(card(fresh.page)).toContainText('NO KEY YET');
  await fresh.page.context().setOffline(true);
  await expect(fresh.page.getByRole('button', { name: 'Register this device' })).toBeDisabled();

  const ready = await openDevice(open, { list: [DEVICE], key: KEY });

  await expect(card(ready.page)).toContainText('READY');
  await ready.page.context().setOffline(true);
  await expect(ready.page.getByRole('button', { name: 'Revoke this device' })).toBeDisabled();
});
