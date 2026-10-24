// docs/FE/features/s19-record.md §7: one test per criterion #1..#18, in the browser, under the docs/FE/fidelity.md §2
// conditions. Sign-in uses the real Privy test account (backend/.env); `GET /me`, the devices list, capture-target,
// upload-url, submit and the MinIO PUT are answered by the spec (the backend does not run). The camera is Chromium's fake
// device, the GPS is the context's, and the signing key is a real one seeded into this phone's IndexedDB before the app
// loads. The fixed clock is paused where a test needs a duration: the recorder's own timer reads `performance.now`.
import { createPublicKey, verify } from 'node:crypto';
import type { Page } from '@playwright/test';
import { SARI } from './fixtures/accounts';
import { DEVICE, DEVICE_ID, devicesOf } from './fixtures/device';
import {
  FIX,
  HELD,
  REJECTED_SUBMISSION,
  ROOTS,
  SUBMISSION,
  SUBMIT_202,
  TAG,
  TARGET_3001,
  TARGET_3104_HELD,
  TARGET_NO_TAG,
  UPLOAD_201,
  refusal,
} from './fixtures/record';
import { answerDevices } from './helpers/device';
import { expect, test, type OpenOptions } from './helpers/flow';
import {
  answerEvidence,
  cameraAsked,
  holdSigning,
  readQueue,
  releaseSigning,
  seedKey,
  seeQr,
  stubQr,
  unavailable,
  watchCamera,
  type EvidenceServer,
  type Recorded,
  type SeededKey,
} from './helpers/record';
import { openSignedIn } from './helpers/signed-in';

const ROW = 'S19';
const TREE = '/app/planter/record?tree=3001&kind=ALIVE';
const TEST_MS = 120_000;
const HTTP_UNPROCESSABLE = 422;
const PAUSED_AT = new Date('2026-10-23T09:42:31.000Z');
const SECOND = 1000;
const MOVED = { latitude: -7.5, longitude: 109.5, accuracy: 5 };

test.describe.configure({ timeout: TEST_MS });

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

type Setup = {
  path?: string;
  server?: Partial<EvidenceServer>;
  key?: boolean;
  fix?: { latitude: number; longitude: number; accuracy: number } | null;
  denyCamera?: boolean;
  qr?: boolean;
  hold?: boolean;
};

type Opened = { page: Page; record: Recorded; key: SeededKey | null };

const SERVER: EvidenceServer = {
  target: { body: TARGET_3001 },
  uploadUrl: { status: 201, body: UPLOAD_201 },
  submit: { status: 202, body: SUBMIT_202 },
};

/** S19 as Sari, with a registered key and the fixture GPS fix unless `setup` says otherwise. */
const openRecord = async (open: Open, setup: Setup = {}): Promise<Opened> => {
  const record: Recorded = { api: [], puts: [] };
  let key: SeededKey | null = null;
  const { page } = await openSignedIn(
    open,
    { row: ROW, profile: SARI, path: setup.path ?? TREE },
    async (target) => {
      const context = target.context();

      key = setup.key === false ? null : await seedKey(target, SARI.id, DEVICE_ID);
      await watchCamera(target, setup.denyCamera === true);
      await stubQr(target, setup.qr === true);

      if (setup.hold === true) {
        await holdSigning(target);
      }

      if (setup.fix !== null) {
        await context.grantPermissions(['geolocation']);
        await context.setGeolocation(setup.fix ?? FIX);
      }

      await answerEvidence(target, { ...SERVER, ...setup.server }, record);
      await answerDevices(
        target,
        () => ({
          body: devicesOf(key === null ? [] : [{ ...DEVICE, thumbprint: key.thumbprint }]),
        }),
        [],
      );
    },
  );

  return { page, record, key };
};

const goLive = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Open camera & GPS' }).click();
  await expect(page.getByRole('button', { name: 'Start recording' })).toBeVisible();
};

/** Records `seconds` on the paused clock: time moves only when the spec says so. */
const recordFor = async (page: Page, seconds: number): Promise<void> => {
  await page.clock.pauseAt(PAUSED_AT);
  await page.getByRole('button', { name: 'Start recording' }).click();
  await page.clock.runFor(seconds * SECOND);
};

/** A sealed clip of 7.2 s, in review. */
const sealed = async (page: Page): Promise<void> => {
  await goLive(page);
  await recordFor(page, 7.2);
  await page.getByRole('button', { name: 'Stop recording' }).click();
  await expect(page.getByRole('heading', { name: 'Sealed on this device' })).toBeVisible();
};

const toast = (page: Page) => page.locator('.toast-area');

test('#1 the eyebrow, the subtitle and the idle lead come from the capture target', async ({
  open,
}) => {
  const { page } = await openRecord(open);

  await expect(page.locator('.pl-ev-head .eyebrow')).toHaveText('CHECK-IN · MONTH 6 · TREE #3001');
  await expect(page.locator('.pl-ev-head p')).toHaveText(
    'Roots that stay · camera and GPS on this device, sealed when you stop.',
  );
  await expect(page.locator('.pl-lead')).toHaveText(
    'Your position must be within 15 m of where this tree was planted. GPS and time lock the moment you start recording. Keep tree tag TC-K7QM-3XRA in frame, with challenge R4M9 beside it.',
  );
});

test('#2 without a signing key, the camera is never asked for', async ({ open }) => {
  const { page } = await openRecord(open, { key: false });

  await page.getByRole('button', { name: 'Open camera & GPS' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'This browser has no signing key. Register this device first.',
  );
  expect(await cameraAsked(page)).toBe(0);
  await expect(page.getByRole('button', { name: 'Open camera & GPS' })).toBeVisible();
});

test('#3 a denied camera says so and leaves the page in idle', async ({ open }) => {
  const { page } = await openRecord(open, { denyCamera: true });

  await page.getByRole('button', { name: 'Open camera & GPS' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Camera permission denied. Allow the camera for this site and try again.',
  );
  await expect(page.getByRole('button', { name: 'Open camera & GPS' })).toBeVisible();
});

test('#4 the live fix reads in the chip and the facts, and Start waits for one', async ({
  open,
}) => {
  const { page } = await openRecord(open);

  await goLive(page);
  await expect(page.locator('.ev-chip.ok').first()).toHaveText('-7.424310, 109.239870 · ±8 m');
  await expect(page.locator('.ws-facts')).toContainText('±8.4 m · OK');
  await expect(page.getByRole('button', { name: 'Start recording' })).toBeEnabled();

  const waiting = await openRecord(open, { fix: null });

  await goLive(waiting.page);
  await expect(waiting.page.locator('.ev-chip.wait').first()).toHaveText('Waiting for GPS…');
  await expect(waiting.page.getByRole('button', { name: 'Start recording' })).toBeDisabled();
});

test('#5 a 41 m fix warns, explains, and still lets the planter record', async ({ open }) => {
  const { page } = await openRecord(open, { fix: { ...FIX, accuracy: 41 } });

  await goLive(page);
  await expect(page.locator('.ev-chip.warn')).toBeVisible();
  await expect(page.locator('.ws-callout')).toContainText('Accuracy is above 30 m.');
  await expect(page.getByRole('button', { name: 'Start recording' })).toBeEnabled();
});

test('#6 Stop counts down the 5 s minimum, and 10 s stops by itself', async ({ open }) => {
  const { page } = await openRecord(open, { hold: true });

  await goLive(page);
  await recordFor(page, 3);
  await expect(page.getByRole('button', { name: 'Stop · minimum 5 s (2)' })).toBeDisabled();
  await page.clock.runFor(7 * SECOND);
  await expect(page.getByText('Hashing the original video and signing…')).toBeVisible();
  await releaseSigning(page);
  await expect(page.getByRole('heading', { name: 'Sealed on this device' })).toBeVisible();
});

test('#7 a sealed 7.2 s clip shows what was signed, and the signature verifies against the key', async ({
  open,
}) => {
  const { page, record, key } = await openRecord(open);

  await sealed(page);
  await expect(page.locator('.ws-facts')).toContainText('7.2 s');
  await expect(page.locator('video.ev-video[controls]')).toHaveAttribute('src', /^blob:/u);
  await expect(page.locator('.ws-facts')).toContainText(TAG);

  await page.locator('.ev-payload summary').click();

  const canonical = (await page.locator('.ev-payload code').textContent()) ?? '';

  for (const part of ['"milestone":2', '"lat":-7.424310', '"acc":8.4', '"challenge":"R4M9"']) {
    expect(canonical).toContain(part);
  }

  expect(canonical.endsWith(`"tag":"${TAG}"}`)).toBe(true);
  await page.getByRole('button', { name: 'Upload now' }).click();
  await expect.poll(() => record.api.filter(({ path }) => path.endsWith('/submit')).length).toBe(1);

  const body = record.api.find(({ path }) => path.endsWith('/submit'))?.body as {
    canonical: string;
    signature: string;
  };

  expect(body.canonical).toBe(canonical);
  expect(
    verify(
      'sha256',
      Buffer.from(canonical),
      {
        key: createPublicKey({ key: { ...key?.publicJwk, kty: 'EC' }, format: 'jwk' }),
        dsaEncoding: 'ieee-p1363',
      },
      Buffer.from(body.signature, 'base64url'),
    ),
  ).toBe(true);
});

test('#8 the signed position is the fix at the start, not where the planter moved to', async ({
  open,
}) => {
  const { page } = await openRecord(open);

  await goLive(page);
  await page.clock.pauseAt(PAUSED_AT);
  await page.getByRole('button', { name: 'Start recording' }).click();
  await page.context().setGeolocation(MOVED);
  await page.clock.runFor(6 * SECOND);
  await page.getByRole('button', { name: 'Stop recording' }).click();
  await page.locator('.ev-payload summary').click();
  await expect(page.locator('.ev-payload code')).toContainText('"lat":-7.424310,"lon":109.239870');
});

test('#9 upload-url, the PUT and submit carry the sealed values and nothing else', async ({
  open,
}) => {
  const { page, record } = await openRecord(open);

  await sealed(page);
  await page.getByRole('button', { name: 'Upload now' }).click();
  await expect.poll(() => record.api.filter(({ path }) => path.endsWith('/submit')).length).toBe(1);

  const upload = record.api.find(({ path }) => path.endsWith('/upload-url'))?.body as Record<
    string,
    unknown
  >;
  const submit = record.api.find(({ path }) => path.endsWith('/submit'))?.body as {
    payload: { videoSha256: string };
    canonical: string;
    signature: string;
  };
  const [put] = record.puts;

  expect(upload).toEqual({
    kind: 'ALIVE',
    campaign: ROOTS,
    treeId: '3001',
    milestone: 2,
    sha256: submit.payload.videoSha256,
    sizeBytes: put?.size,
    durationSec: 7.2,
    contentType: 'video/webm',
  });
  expect(put?.headers['content-type']).toBe('video/webm');
  expect(put?.headers['x-amz-checksum-sha256']).toBe(
    'nyxBqwfeWMPhtG8qnXwD5bihT20sngezpfgdTG4r5Bo=',
  );
  expect(put?.headers.authorization).toBeUndefined();
  expect(Object.keys(submit).sort()).toEqual(['canonical', 'payload', 'signature']);
});

test('#10 a 202 opens S21 with the success toast, and the queue keeps nothing', async ({
  open,
}) => {
  const { page } = await openRecord(open);

  await sealed(page);
  await page.getByRole('button', { name: 'Upload now' }).click();
  await page.waitForURL(`**/app/evidence/${SUBMISSION}`);
  await expect(toast(page)).toContainText('Prechecks passed. Waiting for scoring.');
  expect(await readQueue(page)).toHaveLength(0);
});

test('#11 a 422 at submit opens S21 of the rejected submission with the error toast', async ({
  open,
}) => {
  const { page } = await openRecord(open, {
    server: {
      submit: {
        status: HTTP_UNPROCESSABLE,
        body: refusal('precheck_failed', {
          reasons: ['gps_inaccurate'],
          submissionId: REJECTED_SUBMISSION,
        }),
      },
    },
  });

  await sealed(page);
  await page.getByRole('button', { name: 'Upload now' }).click();
  await page.waitForURL(`**/app/evidence/${REJECTED_SUBMISSION}`);
  await expect(toast(page)).toContainText('Rejected by the prechecks. See why.');
});

test('#12 a 503 at upload-url shows the failure and keeps the recording queued', async ({
  open,
}) => {
  const { page } = await openRecord(open, { server: { uploadUrl: unavailable() } });

  await sealed(page);
  await page.getByRole('button', { name: 'Upload now' }).click();
  await expect(page.getByRole('alert').locator('[data-copy="COPY-204"]')).toBeVisible();

  const rows = await readQueue(page);

  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ profileId: SARI.id, submissionId: null });
});

test('#13 "Save offline" queues the recording, opens S20 and toasts the window', async ({
  open,
}) => {
  const { page } = await openRecord(open);

  await sealed(page);
  await page.getByRole('button', { name: 'Save offline' }).click();
  await page.waitForURL('**/app/planter/uploads');
  await expect(toast(page)).toContainText('Saved on this device. Upload within 72 hours.');
  expect(await readQueue(page)).toHaveLength(1);
});

test('#14 "Retake" drops the clip and goes back to idle', async ({ open }) => {
  const { page } = await openRecord(open);

  await sealed(page);
  await page.getByRole('button', { name: 'Retake' }).click();
  await expect(page.getByRole('button', { name: 'Open camera & GPS' })).toBeVisible();
  await expect(page.locator('video[controls]')).toHaveCount(0);
});

test('#15 a held milestone blocks capture and links the submission', async ({ open }) => {
  const { page } = await openRecord(open, {
    path: '/app/planter/record?tree=3104&kind=ALIVE',
    server: { target: { body: TARGET_3104_HELD } },
  });
  const empty = page.locator('.ws-empty');

  await expect(empty.locator('h2')).toHaveText('This milestone already has a check-in');
  await expect(empty).toContainText(
    `Submission ${HELD} is in review; a month 6 check-in counts once.`,
  );
  await empty.getByRole('link', { name: 'Open that submission' }).click();
  await page.waitForURL(`**/app/evidence/${HELD}`);
});

test('#16 a planting link without its campaign is a bad link and sends nothing', async ({
  open,
}) => {
  const { page, record } = await openRecord(open, {
    path: '/app/planter/record?slot=41&kind=PLANTED',
  });

  await expect(page.locator('.ws-empty h2')).toHaveText('Capture target unavailable');
  expect(record.api).toHaveLength(0);
});

test('#17 a missing tag blocks capture with its own sentence (FR-089)', async ({ open }) => {
  const { page } = await openRecord(open, { server: { target: { body: TARGET_NO_TAG } } });

  await expect(page.locator('.ws-empty h2')).toHaveText(
    'No tree tag has been issued for this target',
  );
});

test('#18 the QR hint shows what the browser read, or says it cannot, and never blocks Start', async ({
  open,
}) => {
  const { page } = await openRecord(open, { qr: true });

  await goLive(page);
  await seeQr(page, [TAG]);
  await expect(page.locator('.ev-chip', { hasText: `✓ Tag ${TAG}` })).toBeVisible();
  await expect(page.locator('.ev-chip', { hasText: 'Show code R4M9' })).toBeVisible();
  await seeQr(page, [TAG, 'TCH-R4M9']);
  await expect(page.locator('.ev-chip', { hasText: '✓ Code R4M9' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start recording' })).toBeEnabled();

  const plain = await openRecord(open);

  await goLive(plain.page);
  await expect(plain.page.locator('.ev-chip', { hasText: `Show tag ${TAG}` })).toBeVisible();
  await expect(plain.page.locator('.ev-chip', { hasText: 'Show code R4M9' })).toBeVisible();
  await expect(plain.page.locator('.ws-note')).toContainText(
    'This browser can’t read QR codes live; the server reads the tag from the video.',
  );
  await expect(plain.page.getByRole('button', { name: 'Start recording' })).toBeEnabled();
});
