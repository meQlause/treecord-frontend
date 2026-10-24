// s08-batch.md §4, §5: the typed tonnes, the quote the contract will charge, and the first rule an amount breaks.
import { describe, expect, it } from 'vitest';
import {
  amountProblem,
  draftKey,
  parseUnits,
  quoteOf,
} from '../../../../src/features/carbon/buy.rules';

describe('parseUnits', () => {
  it('reads tonnes to thousandths, bigint only', () => {
    expect(parseUnits('1.500')).toBe(1500n);
    expect(parseUnits(' 2 ')).toBe(2000n);
    expect(parseUnits('0.001')).toBe(1n);
  });

  it('refuses nothing, zero, four decimals, negatives and words', () => {
    for (const text of ['', '0', '0.000', '1.2345', '-1', 'x', '1,5']) {
      expect(parseUnits(text), text).toBeNull();
    }
  });
});

describe('quoteOf', () => {
  it('is ceil(units × price / 1000), as the contract charges', () => {
    expect(quoteOf(1500n, 18_500_000n)).toBe(27_750_000n);
    expect(quoteOf(1n, 18_500_000n)).toBe(18_500n);
    expect(quoteOf(1n, 1n)).toBe(1n);
  });

  it('is null while the amount or the price is missing', () => {
    expect(quoteOf(null, 18_500_000n)).toBeNull();
    expect(quoteOf(1000n, null)).toBeNull();
    expect(quoteOf(1000n, 0n)).toBeNull();
  });
});

describe('amountProblem and draftKey', () => {
  it('names the first rule broken: format, then stock', () => {
    expect(amountProblem('1.2345', '8400')).toBe('Use a positive amount with up to 3 decimals.');
    expect(amountProblem('8.401', '8400')).toBe('Amount exceeds available inventory.');
    expect(amountProblem('8.400', '8400')).toBeNull();
  });

  it('keys the draft by account, wallet, chain and batch', () => {
    expect(draftKey({ id: 'p1', walletAddress: '0xabc' }, 84532, '101')).toBe(
      'treecord:draft:p1:0xabc:84532:carbon-buy:101',
    );
    expect(draftKey({ id: 'p1', walletAddress: null }, 31337, '7')).toBe(
      'treecord:draft:p1:no-wallet:31337:carbon-buy:7',
    );
  });
});
