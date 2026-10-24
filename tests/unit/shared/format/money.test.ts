import { describe, expect, it } from 'vitest';
import { usdc, usdcValue } from '../../../../src/shared/format/money';

describe('usdc', () => {
  it.each([
    ['1033200000', '1,033.2'],
    ['1050000', '1.05'],
    ['10500000', '10.5'],
    ['1575000', '1.575'],
    ['2100000000', '2,100'],
    ['0', '0'],
    ['1', '0.000001'],
    ['18000000000', '18,000'],
  ])('%s base units read %s', (units, text) => {
    expect(usdc(units)).toBe(text);
  });

  it('keeps every digit of an amount a JS number cannot hold', () => {
    expect(usdc('9007199254740993000001')).toBe('9,007,199,254,740,993.000001');
  });
});

describe('usdcValue', () => {
  it('is the plain number, for art', () => {
    expect(usdcValue('1033200000')).toBeCloseTo(1033.2);
  });
});
