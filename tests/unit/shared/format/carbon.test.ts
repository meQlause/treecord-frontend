import { describe, expect, it } from 'vitest';
import { tonnes, unitCount } from '../../../../src/shared/format/carbon';

describe('tonnes', () => {
  it.each([
    ['8005', '8.005'],
    ['0', '0.000'],
    ['400', '0.400'],
    ['22000', '22.000'],
    ['16000', '16.000'],
    ['1', '0.001'],
  ])('%s units read %s', (units, text) => {
    expect(tonnes(units)).toBe(text);
  });
});

describe('unitCount', () => {
  it('groups the units en-US', () => {
    expect(unitCount('8005')).toBe('8,005');
    expect(unitCount('0')).toBe('0');
  });
});
