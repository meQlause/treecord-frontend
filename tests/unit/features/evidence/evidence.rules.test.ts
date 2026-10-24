// @vitest-environment node
// s19-record.md §2.6 / acceptance #7: the canonical bytes, and a signature that verifies against the key's public JWK.
import { describe, expect, it } from 'vitest';
import { generateDeviceKey } from '../../../../src/features/evidence/device-key';
import {
  baseContentType,
  canonicalize,
  seal,
  sha256Hex,
  type SealTarget,
} from '../../../../src/features/evidence/evidence.rules';

const TARGET: SealTarget = {
  kind: 'ALIVE',
  campaign: '0x0000000000000000000000000000000000000003',
  slotId: null,
  treeId: '3001',
  milestone: 2,
  challenge: 'R4M9',
  tag: 'TC-K7QM-3XRA',
};
const FIX = { lat: -7.42431, lon: 109.23987, acc: 8.44 };
const VIDEO = new Blob(['video bytes']);

describe('seal', () => {
  it('signs the canonical bytes: fixed key order, 6 and 1 decimals, tag last', async () => {
    const key = await generateDeviceKey();
    const sealed = await seal({
      blob: VIDEO,
      target: TARGET,
      fix: FIX,
      capturedAt: '2026-10-23T09:12:31.000Z',
      key,
    });

    expect(sealed.canonical).toContain('"milestone":2,');
    expect(sealed.canonical).toContain('"lat":-7.424310,"lon":109.239870,"acc":8.4,');
    expect(sealed.canonical.endsWith('"tag":"TC-K7QM-3XRA"}')).toBe(true);
    expect(sealed.canonical).toBe(canonicalize(sealed.payload));
    expect(sealed.payload.videoSha256).toBe(await sha256Hex(VIDEO));
    expect(sealed.signature).toHaveLength(86);

    const bytes = Uint8Array.from(
      atob(sealed.signature.replaceAll('-', '+').replaceAll('_', '/')),
      (char) => char.codePointAt(0) ?? 0,
    );
    const verify = await crypto.subtle.importKey(
      'jwk',
      key.publicJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );

    await expect(
      crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        verify,
        bytes,
        new TextEncoder().encode(sealed.canonical),
      ),
    ).resolves.toBe(true);
  });

  it('never prints a negative zero, and keeps null for an absent challenge or slot', async () => {
    const key = await generateDeviceKey();
    const { canonical } = await seal({
      blob: VIDEO,
      target: { ...TARGET, challenge: null },
      fix: { lat: -0.0000001, lon: 0, acc: 3 },
      capturedAt: '2026-10-23T09:12:31.000Z',
      key,
    });

    expect(canonical).toContain('"slotId":null,"treeId":"3001"');
    expect(canonical).toContain('"lat":0.000000,"lon":0.000000,"acc":3.0,');
    expect(canonical).toContain('"challenge":null,');
  });

  it('drops the codec parameter of the recorder type', () => {
    expect(baseContentType('video/webm;codecs=vp9')).toBe('video/webm');
    expect(baseContentType('video/mp4')).toBe('video/mp4');
  });
});
