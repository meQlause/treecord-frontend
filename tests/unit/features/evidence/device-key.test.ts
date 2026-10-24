// @vitest-environment node
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { generateDeviceKey, thumbprintOf } from '../../../../src/features/evidence/device-key';

const JWK = {
  kty: 'EC',
  crv: 'P-256',
  x: 'jJS05mv-cR1HdUP28swlbXQIYKI8ehjhET7Nx8kM5v4',
  y: '2CLcMpUlQAq2Vq5ISJwemZZaUibvScWZBMbiNPm9qxA',
};

describe('thumbprintOf', () => {
  it('is the RFC 7638 thumbprint: SHA-256 of the four members in order, base64url, 43 characters', async () => {
    const canonical = JSON.stringify({ crv: JWK.crv, kty: JWK.kty, x: JWK.x, y: JWK.y });
    const expected = createHash('sha256').update(canonical).digest('base64url');

    expect(await thumbprintOf(JWK)).toBe(expected);
    expect(expected).toHaveLength(43);
  });

  it('does not depend on the order the members arrive in', async () => {
    expect(await thumbprintOf({ y: JWK.y, x: JWK.x, crv: JWK.crv, kty: JWK.kty })).toBe(
      await thumbprintOf(JWK),
    );
  });
});

describe('generateDeviceKey', () => {
  it('makes a P-256 key whose private half cannot be exported, with only the four public members', async () => {
    const key = await generateDeviceKey();

    expect(Object.keys(key.publicJwk).sort()).toEqual(['crv', 'kty', 'x', 'y']);
    expect(key.publicJwk).toMatchObject({ kty: 'EC', crv: 'P-256' });
    expect(key.privateKey.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('jwk', key.privateKey)).rejects.toThrow();
    expect(key.thumbprint).toBe(await thumbprintOf(key.publicJwk));
  });
});
