// s04-campaign.md §4 and "Client amount math": the typed amount in base units, what the contract will take, the refundable sum.
import { describe, expect, it } from 'vitest';
import {
  effectiveOf,
  parseAmount,
  refundableOf,
} from '../../../../src/features/campaigns/campaign.rules';

const USDC = 1_000_000n;

describe('parseAmount', () => {
  it('reads whole and fractional USDC to base units, never through a float', () => {
    expect(parseAmount('25')).toBe(25n * USDC);
    expect(parseAmount(' 0.000001 ')).toBe(1n);
    expect(parseAmount('10.123456')).toBe(10_123_456n);
  });

  it('refuses nothing, zero, negatives, too many decimals and words', () => {
    for (const text of ['', '0', '0.000000', '-5', '10.1234567', '1e3', 'ten', '1,5']) {
      expect(parseAmount(text), text).toBeNull();
    }
  });
});

describe('effectiveOf', () => {
  it('cuts an amount to what is left of the target', () => {
    expect(effectiveOf(250n * USDC, 10_000n * USDC, 9_800n * USDC)).toBe(200n * USDC);
    expect(effectiveOf(25n * USDC, 10_000n * USDC, 6_840n * USDC)).toBe(25n * USDC);
  });
});

describe('refundableOf', () => {
  const figures = {
    contributed: 900n * USDC,
    claimed: false,
    pool: 250n * USDC,
    raised: 9_000n * USDC,
  };

  it('returns the whole contribution while refunding and the pro-rata pool share once completed', () => {
    expect(refundableOf('refunding', figures)).toBe(900n * USDC);
    expect(refundableOf('completed', figures)).toBe(25n * USDC);
  });

  it('is nothing once claimed, and nothing from a campaign that raised nothing', () => {
    expect(refundableOf('refunding', { ...figures, claimed: true })).toBe(0n);
    expect(refundableOf('completed', { ...figures, raised: 0n })).toBe(0n);
  });
});
