// What the S19 spec needs around the page (docs/FE/features/s19-record.md §7): the three evidence endpoints and the MinIO
// PUT answered by the spec with each call recorded, a signing key made here and seeded into this phone's IndexedDB (so the
// spec knows its public half and can verify a signature), the camera and GPS of the fake phone, and the queue read back.
// The backend does not run.
import { createHash, generateKeyPairSync } from 'node:crypto';
import type { Page } from '@playwright/test';
import { refusal } from '../fixtures/record';
import { API_CORS } from './privy';

const NO_CONTENT = 204;
const STATUS_OK = 200;
const JSON_TYPE = { 'Content-Type': 'application/json' };
const STORAGE_CORS = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'PUT,OPTIONS',
};

type EvidenceCall = { method: string; path: string; body: unknown };

export type EvidenceAnswer = { status?: number; body: unknown };

export type EvidenceServer = {
  target: EvidenceAnswer;
  uploadUrl: EvidenceAnswer;
  submit: EvidenceAnswer;
  /** The status MinIO answers the PUT with. */
  put?: number;
};

type PutCall = { headers: Record<string, string>; size: number };

export type Recorded = { api: EvidenceCall[]; puts: PutCall[] };

const answerOf = (server: EvidenceServer, path: string): EvidenceAnswer => {
  if (path.endsWith('/capture-target')) {
    return server.target;
  }

  return path.endsWith('/upload-url') ? server.uploadUrl : server.submit;
};

/** Answers `capture-target`, `upload-url`, `:id/submit` (and their preflights) and the MinIO PUT. */
export const answerEvidence = async (
  page: Page,
  server: EvidenceServer,
  record: Recorded,
): Promise<void> => {
  await page.route('**/api/v1/evidence/**', async (route) => {
    const request = route.request();

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: NO_CONTENT, headers: API_CORS });

      return;
    }

    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    const answer = answerOf(server, path);

    record.api.push({
      method: request.method(),
      path,
      body: request.postData() === null ? undefined : (request.postDataJSON() as unknown),
    });
    await route.fulfill({
      status: answer.status ?? STATUS_OK,
      headers: { ...API_CORS, ...JSON_TYPE },
      body: JSON.stringify(answer.body),
    });
  });
  await page.route('http://localhost:9000/**', async (route) => {
    const request = route.request();

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: NO_CONTENT, headers: STORAGE_CORS });

      return;
    }

    record.puts.push({ headers: request.headers(), size: request.postDataBuffer()?.length ?? 0 });
    await route.fulfill({ status: server.put ?? STATUS_OK, headers: STORAGE_CORS, body: '' });
  });
};

const HTTP_UNAVAILABLE = 503;

export const unavailable = (): EvidenceAnswer => ({
  status: HTTP_UNAVAILABLE,
  body: refusal('service_unavailable'),
});

export type SeededKey = {
  thumbprint: string;
  deviceId: string;
  publicJwk: { kty: string; crv: string; x: string; y: string };
};

/**
 * A real P-256 key, made here: the browser imports its private half as non-extractable into `keys` before the app loads,
 * and the spec keeps the public half (to verify a signature, and to list the key as registered).
 */
export const seedKey = async (
  page: Page,
  profileId: string,
  deviceId: string,
): Promise<SeededKey> => {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const publicJwk = publicKey.export({ format: 'jwk' }) as SeededKey['publicJwk'];
  const members = { crv: publicJwk.crv, kty: publicJwk.kty, x: publicJwk.x, y: publicJwk.y };
  const thumbprint = createHash('sha256').update(JSON.stringify(members)).digest('base64url');

  await page.addInitScript(
    async ([profile, record, jwk]) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('treecord-device', 1);

        request.onupgradeneeded = () =>
          ['keys', 'clips', 'queue'].forEach((store) => request.result.createObjectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const imported = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign'],
      );

      database
        .transaction('keys', 'readwrite')
        .objectStore('keys')
        .put({ ...record, privateKey: imported }, profile);
    },
    [
      profileId,
      { thumbprint, deviceId, publicJwk, label: 'Pixel 8', createdAt: '2026-10-23T03:20:15.067Z' },
      privateKey.export({ format: 'jwk' }),
    ] as const,
  );

  return { thumbprint, deviceId, publicJwk };
};

/** The queue rows of this phone now (the clips stay in `clips`). */
export const readQueue = (page: Page): Promise<Record<string, unknown>[]> =>
  page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('treecord-device', 1);

      request.onupgradeneeded = () =>
        ['keys', 'clips', 'queue'].forEach((store) => request.result.createObjectStore(store));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return new Promise<Record<string, unknown>[]>((resolve, reject) => {
      const request = database.transaction('queue').objectStore('queue').getAll();

      request.onsuccess = () => resolve(request.result as Record<string, unknown>[]);
      request.onerror = () => reject(request.error);
    });
  });

/** Counts the camera requests and, when asked, refuses them the way a denied permission does. */
export const watchCamera = async (page: Page, deny = false): Promise<void> => {
  await page.addInitScript((refuse) => {
    const devices = navigator.mediaDevices;
    const real = devices.getUserMedia.bind(devices);
    const count = { asked: 0 };

    Object.assign(window, { cameraAsked: count });
    devices.getUserMedia = (constraints) => {
      count.asked += 1;

      return refuse
        ? Promise.reject(new DOMException('denied', 'NotAllowedError'))
        : real(constraints);
    };
  }, deny);
};

export const cameraAsked = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as { cameraAsked: { asked: number } }).cameraAsked.asked);

/** Holds the signature until `releaseSigning`, so the "Hashing…" line can be seen. */
export const holdSigning = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const real = crypto.subtle.sign.bind(crypto.subtle);

    Object.assign(window, { holdSign: true });
    crypto.subtle.sign = async (...args: Parameters<SubtleCrypto['sign']>) => {
      const hold = window as unknown as { holdSign: boolean; releaseSign?: () => void };

      if (hold.holdSign) {
        await new Promise<void>((resolve) => {
          hold.releaseSign = resolve;
        });
      }

      return real(...args);
    };
  });
};

export const releaseSigning = (page: Page): Promise<void> =>
  page.evaluate(() => {
    (window as unknown as { releaseSign?: () => void }).releaseSign?.();
  });

/** A `BarcodeDetector` that reads whatever `window.qrSeen` holds, or none at all. */
export const stubQr = async (page: Page, present: boolean): Promise<void> => {
  await page.addInitScript((has) => {
    Reflect.deleteProperty(window, 'BarcodeDetector');

    if (has) {
      Object.assign(window, {
        qrSeen: [],
        BarcodeDetector: class {
          detect() {
            return Promise.resolve(
              (window as unknown as { qrSeen: string[] }).qrSeen.map((rawValue) => ({ rawValue })),
            );
          }
        },
      });
    }
  }, present);
};

export const seeQr = (page: Page, values: string[]): Promise<void> =>
  page.evaluate((seen) => {
    Object.assign(window, { qrSeen: seen });
  }, values);
