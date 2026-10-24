// s15-my-carbon.md §4, §5: the shares of a card, the section, the ledger stacks and what D10 accepts.
import { describe, expect, it } from 'vitest';
import type { Balance, Reservation } from '../../../../src/features/carbon/holdings.api';
import {
  heldShare,
  issuedShare,
  parseTab,
  retireDraftKey,
  retireProblem,
  stackOf,
  tabParam,
} from '../../../../src/features/carbon/my-carbon.rules';

describe('shares', () => {
  it('holds amount / (amount + retired) of a batch, and allocated / reserved of a reservation', () => {
    expect(heldShare({ amount: '1200', retiredAmount: '400' } as Balance)).toBe(75);
    expect(heldShare({ amount: '0', retiredAmount: '0' } as Balance)).toBe(0);
    expect(issuedShare({ allocatedAmount: '1600', reservedAmount: '2000' } as Reservation)).toBe(
      80,
    );
    expect(issuedShare({ allocatedAmount: '0', reservedAmount: '0' } as Reservation)).toBe(0);
  });
});

describe('tab', () => {
  it('reads the section from the URL and leaves the first one out of it', () => {
    expect(parseTab('reservations')).toBe('Reservations');
    expect(parseTab('nonsense')).toBe('Issued balances');
    expect(tabParam('Issued balances')).toBeUndefined();
    expect(tabParam('Retirements')).toBe('retirements');
  });
});

describe('stackOf', () => {
  it('keeps one coin for any amount and scales the rest to the tallest stack', () => {
    expect(stackOf(1, [1, 1000, 1])).toBe(1);
    expect(stackOf(0, [0, 0, 0])).toBe(0);
    expect(stackOf(1000, [1000, 500, 0])).toBe(7);
  });
});

describe('retireProblem', () => {
  const draft = {
    amount: '0.500',
    beneficiary: 'PT Hijau Lestari',
    purpose: ' 2026 scope 3 offset ',
  };

  it('names the amount first, then the beneficiary', () => {
    expect(retireProblem({ ...draft, amount: '2.2001' }, '2200')).toMatchObject({
      field: 'amount',
    });
    expect(retireProblem({ ...draft, amount: '2.201' }, '2200')).toMatchObject({ field: 'amount' });
    expect(retireProblem({ ...draft, beneficiary: '   ' }, '2200')).toMatchObject({
      field: 'beneficiary',
      text: 'Enter a beneficiary.',
    });
  });

  it('sends the amount in units and the text trimmed', () => {
    expect(retireProblem(draft, '2200')).toEqual({
      units: 500n,
      beneficiary: 'PT Hijau Lestari',
      purpose: '2026 scope 3 offset',
    });
  });

  it('keys the draft by account, wallet, chain and batch', () => {
    expect(retireDraftKey({ id: 'p1', walletAddress: '0xabc' }, 31337, '101')).toBe(
      'treecord:draft:carbon-retire:p1:0xabc:31337:101',
    );
  });
});
