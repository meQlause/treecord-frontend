// What S19 seals on stop (s19-record.md §2.6, NFR-043): the SHA-256 of the original bytes, the canonical payload with its
// fixed key order, and an ECDSA P-256 / SHA-256 signature (IEEE P1363, base64url) from the device key. Pure; the same
// vectors the backend checks.
import { base64url } from './device-key';

export type CaptureKind = 'PLANTED' | 'ALIVE' | 'DEAD' | 'REPLANTED';

export type Fix = { lat: number; lon: number; acc: number };

/** What the capture-target names: copied into the payload, never edited. */
export type SealTarget = {
  kind: CaptureKind;
  campaign: string;
  slotId: string | null;
  treeId: string | null;
  milestone: number;
  challenge: string | null;
  tag: string | null;
};

export type CapturePayload = SealTarget & {
  v: 1;
  videoSha256: string;
  lat: number;
  lon: number;
  acc: number;
  capturedAt: string;
  deviceKey: string;
};

export type Sealed = { payload: CapturePayload; canonical: string; signature: string };

const HEX = 16;
const HEX_WIDTH = 2;
const LAT_LON_DECIMALS = 6;
const ACC_DECIMALS = 1;
const TENTH = 10;

export const sha256Hex = async (blob: Blob): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(HEX).padStart(HEX_WIDTH, '0'))
    .join('');
};

/** `toFixed`, without the sign of a negative zero. */
const fixed = (value: number, decimals: number): string => {
  const text = value.toFixed(decimals);

  return /^-0\.0+$/u.test(text) ? text.slice(1) : text;
};

const orNull = (value: string | null): string => (value === null ? 'null' : JSON.stringify(value));

/** The bytes that are signed: fixed key order, no whitespace, lat/lon 6 decimals, acc 1 decimal. */
export const canonicalize = (payload: CapturePayload): string =>
  `{${[
    `"v":${payload.v}`,
    `"kind":${JSON.stringify(payload.kind)}`,
    `"campaign":${JSON.stringify(payload.campaign)}`,
    `"slotId":${orNull(payload.slotId)}`,
    `"treeId":${orNull(payload.treeId)}`,
    `"milestone":${payload.milestone}`,
    `"videoSha256":${JSON.stringify(payload.videoSha256)}`,
    `"lat":${fixed(payload.lat, LAT_LON_DECIMALS)}`,
    `"lon":${fixed(payload.lon, LAT_LON_DECIMALS)}`,
    `"acc":${fixed(payload.acc, ACC_DECIMALS)}`,
    `"capturedAt":${JSON.stringify(payload.capturedAt)}`,
    `"challenge":${orNull(payload.challenge)}`,
    `"deviceKey":${JSON.stringify(payload.deviceKey)}`,
    `"tag":${orNull(payload.tag)}`,
  ].join(',')}}`;

const signCanonical = async (privateKey: CryptoKey, canonical: string): Promise<string> =>
  base64url(
    new Uint8Array(
      await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        privateKey,
        new TextEncoder().encode(canonical),
      ),
    ),
  );

type SealInput = {
  blob: Blob;
  target: SealTarget;
  /** The fix and instant locked when recording started. */
  fix: Fix;
  capturedAt: string;
  key: { privateKey: CryptoKey; thumbprint: string };
};

export const seal = async ({ blob, target, fix, capturedAt, key }: SealInput): Promise<Sealed> => {
  const payload: CapturePayload = {
    v: 1,
    ...target,
    videoSha256: await sha256Hex(blob),
    lat: fix.lat,
    lon: fix.lon,
    acc: Math.round(fix.acc * TENTH) / TENTH,
    capturedAt,
    deviceKey: key.thumbprint,
  };
  const canonical = canonicalize(payload);

  return { payload, canonical, signature: await signCanonical(key.privateKey, canonical) };
};

/** `video/webm;codecs=vp9` → `video/webm`: the form the server's enum takes. */
export const baseContentType = (mime: string): string => mime.split(';')[0]?.trim() ?? mime;
