// The device signing key (s22-device.md §2, NFR-001): an ECDSA P-256 key pair made with WebCrypto, `extractable: false`, so
// the private half can be used to sign but never read out; only the public JWK and a label leave the browser. The record
// is kept per profile and written only after the server accepted the key, so a failed register never leaves one behind.
import { KEYS, inStore } from './device-db';

export type PublicJwk = { kty: string; crv: string; x: string; y: string };

/** The record kept for one profile. `privateKey` is a non-extractable CryptoKey (structured-cloned into IndexedDB). */
export type KeyRecord = {
  privateKey: CryptoKey;
  publicJwk: PublicJwk;
  thumbprint: string;
  deviceId: string;
  label: string;
  createdAt: string;
};

const BYTE = 0xff;

const base64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes.map((byte) => byte & BYTE)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');

/** RFC 7638 thumbprint of a P-256 public JWK: SHA-256 of its four members in order, base64url (the payload's `deviceKey`). */
export const thumbprintOf = async ({ crv, kty, x, y }: PublicJwk): Promise<string> => {
  const canonical = JSON.stringify({ crv, kty, x, y });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));

  return base64url(new Uint8Array(digest));
};

/** A new non-extractable key pair: the private key stays here, the four public members go to the server. */
export const generateDeviceKey = async (): Promise<{
  privateKey: CryptoKey;
  publicJwk: PublicJwk;
  thumbprint: string;
}> => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
    'verify',
  ]);
  const exported = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const publicJwk = { kty: 'EC', crv: 'P-256', x: exported.x ?? '', y: exported.y ?? '' };

  return { privateKey: pair.privateKey, publicJwk, thumbprint: await thumbprintOf(publicJwk) };
};

/** The record of `profileId`, or `null` when this browser holds none (or storage is blocked). */
export const readKeyRecord = async (profileId: string): Promise<KeyRecord | null> => {
  try {
    return (
      ((await inStore(KEYS, 'readonly', (store) => store.get(profileId))) as
        KeyRecord | undefined) ?? null
    );
  } catch {
    return null;
  }
};

export const writeKeyRecord = (profileId: string, record: KeyRecord): Promise<IDBValidKey> =>
  inStore(KEYS, 'readwrite', (store) => store.put(record, profileId));

export const deleteKeyRecord = (profileId: string): Promise<undefined> =>
  inStore(KEYS, 'readwrite', (store) => store.delete(profileId));
