import { describe, expect, it } from 'vitest';
import { shortAddress } from '../../../../src/shared/format/address';

describe('shortAddress', () => {
  it('keeps the first six and last four characters (SH-AC4)', () => {
    expect(shortAddress('0x4b9e1234567890abcdef1234567890abcdef9d0e')).toBe('0x4b9e…9d0e');
  });
});
