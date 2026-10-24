import { describe, expect, it } from 'vitest';
import { number } from '../../../../src/shared/format/number';

describe('number', () => {
  it('groups thousands', () => {
    expect(number(1_234_567)).toBe('1,234,567');
  });

  it('keeps up to six decimals and no more', () => {
    expect(number(1.5)).toBe('1.5');
    expect(number(0.123_456_78)).toBe('0.123457');
  });

  it('writes zero as 0', () => {
    expect(number(0)).toBe('0');
  });
});
