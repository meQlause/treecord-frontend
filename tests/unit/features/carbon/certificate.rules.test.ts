import { describe, expect, it } from 'vitest';
import { recordCoord, registryLine } from '../../../../src/features/carbon/certificate.copy';
import { artName, shareOf, shortHex } from '../../../../src/features/carbon/certificate.rules';

describe('shortHex', () => {
  it('keeps the first six and the last four characters', () => {
    expect(shortHex('0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9f0e')).toBe('0x1a2b…9f0e');
  });
});

describe('shareOf', () => {
  it('is the retired part of the batch: 500 of 16000', () => {
    expect(shareOf({ amount: '500', batch: { issuedAmount: '16000' } as never })).toBe(0.03125);
  });

  it('is nothing for a batch that issued nothing, not a division by zero', () => {
    expect(shareOf({ amount: '0', batch: { issuedAmount: '0' } as never })).toBe(0);
  });
});

describe('artName', () => {
  it('cuts a name over 16 characters to its first 15 and an ellipsis', () => {
    expect(artName('PT Hijau Lestari')).toBe('PT Hijau Lestari');
    expect(artName('PT Hijau Lestari Raya')).toBe('PT Hijau Lestar…');
  });
});

describe('registryLine', () => {
  it('says what the pending registry waits for, and never "updates when" once it is done', () => {
    expect(registryLine('pending', 'SRN PPI', null)).toBe(
      'Pending · updates when SRN PPI confirms',
    );
    expect(registryLine('done', 'SRN PPI', 'SRN-RET-2026-000042')).toBe(
      'Done · SRN-RET-2026-000042',
    );
    expect(registryLine('done', 'SRN PPI', null)).toBe('Done');
  });
});

describe('recordCoord', () => {
  it('is the id in capitals, cut at 16 characters', () => {
    expect(recordCoord('1')).toBe('RECORD / 1');
    expect(recordCoord('abcdefghijklmnopqrst')).toBe('RECORD / ABCDEFGHIJKLMNOP');
  });
});
