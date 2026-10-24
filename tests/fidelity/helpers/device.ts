// The device endpoints and this phone's IndexedDB for the S22 spec (docs/FE/features/s22-device.md §7): `GET`, `POST` and
// `DELETE /api/v1/devices` answered by the spec with each call recorded, and helpers that seed or read the key record and
// the queue before and after the page runs. The backend does not run.
import type { Page } from '@playwright/test';
import { API_CORS } from './privy';

const NO_CONTENT = 204;
const STATUS_OK = 200;
const JSON_TYPE = { 'Content-Type': 'application/json' };

export type DeviceCall = { method: string; path: string; body: unknown };

export type DeviceAnswer = { status?: number; body: unknown; after?: Promise<unknown> };

export type DeviceResponder = (call: DeviceCall) => DeviceAnswer;

/** Answers every call to `/devices` (and its preflight) with `answer`; each call is pushed to `calls`. */
export const answerDevices = async (
  page: Page,
  answer: DeviceResponder,
  calls: DeviceCall[],
): Promise<void> => {
  await page.route('**/api/v1/devices**', async (route) => {
    const request = route.request();

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: NO_CONTENT, headers: API_CORS });

      return;
    }

    const call = {
      method: request.method(),
      path: new URL(request.url()).pathname.replace('/api/v1', ''),
      body: request.postData() === null ? undefined : (request.postDataJSON() as unknown),
    };

    calls.push(call);
    const { status = STATUS_OK, body, after } = answer(call);

    await after;

    await route.fulfill({
      status,
      headers: { ...API_CORS, ...JSON_TYPE },
      body: JSON.stringify(body),
    });
  });
};

export type SeededKey = { thumbprint: string; deviceId: string; label: string; createdAt: string };

export type SeededRow = { profileId: string; payload: { deviceKey: string } };

/**
 * Puts a key record (a real non-extractable key, the thumbprint and device id of `key`) and the queue `rows` into this
 * phone's IndexedDB before the app loads (the app keeps no login across a reload, so it cannot be done afterwards).
 */
export const seedDevice = async (
  page: Page,
  profileId: string,
  seed: { key?: SeededKey; rows?: SeededRow[] },
): Promise<void> => {
  await page.addInitScript(
    async ([profile, data]) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('treecord-device', 1);

        request.onupgradeneeded = () =>
          ['keys', 'clips', 'queue'].forEach((store) => request.result.createObjectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const write = database.transaction(['keys', 'queue'], 'readwrite');

      if (data.key !== undefined) {
        const pair = await crypto.subtle.generateKey(
          { name: 'ECDSA', namedCurve: 'P-256' },
          false,
          ['sign', 'verify'],
        );

        write.objectStore('keys').put(
          {
            ...data.key,
            privateKey: pair.privateKey,
            publicJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
          },
          profile,
        );
      }

      (data.rows ?? []).forEach((row, index) =>
        write.objectStore('queue').put(row, `row-${index}`),
      );
    },
    [profileId, seed] as const,
  );
};

export type ReadKey = {
  deviceId: string;
  thumbprint: string;
  label: string;
  exportable: boolean;
} | null;

/** What this phone's IndexedDB holds for `profileId` now, and whether the private key could be exported (it must not). */
export const readKey = (page: Page, profileId: string): Promise<ReadKey> =>
  page.evaluate(async (profile) => {
    const settled = <T>(request: IDBRequest<T>): Promise<T> =>
      new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    const opening = indexedDB.open('treecord-device', 1);

    opening.onupgradeneeded = () =>
      ['keys', 'clips', 'queue'].forEach((store) => opening.result.createObjectStore(store));
    const database = await settled(opening);
    const record = (await settled(
      database.transaction('keys').objectStore('keys').get(profile),
    )) as
      { deviceId: string; thumbprint: string; label: string; privateKey: CryptoKey } | undefined;

    if (record === undefined) {
      return null;
    }

    const exportable = await crypto.subtle.exportKey('jwk', record.privateKey).then(
      () => true,
      () => false,
    );

    return {
      deviceId: record.deviceId,
      thumbprint: record.thumbprint,
      label: record.label,
      exportable,
    };
  }, profileId);
