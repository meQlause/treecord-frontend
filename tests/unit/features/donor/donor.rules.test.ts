import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../../src/shared/api/errors';
import type { DonorCard } from '../../../../src/features/donor/donor.api';
import {
  carbonRows,
  carbonText,
  fundedPercent,
  hasNoCarbon,
  healthCounts,
  homeView,
  parseTab,
  plantedShare,
  readOf,
  shareText,
  statusOf,
  survivalPercent,
  treesPerGlyph,
} from '../../../../src/features/donor/donor.rules';

const card = (carbon: DonorCard['carbon']) => ({ carbon }) as DonorCard;

const NOTHING = card({
  campaignEstimate: null,
  reservation: null,
  issuedHoldings: { issuedAmount: '0' },
});

const ROOTS = card({
  campaignEstimate: { estimatedAmount: '8005' },
  reservation: { reservedAmount: '533', allocatedAmount: '0' },
  issuedHoldings: { issuedAmount: '0' },
});

describe('tabs', () => {
  it('an unknown ?status= is "All", and "All" sends no status', () => {
    expect(parseTab('Paused')).toBe('All');
    expect(parseTab(null)).toBe('All');
    expect(parseTab('Refunding')).toBe('Refunding');
    expect(statusOf('All')).toBeUndefined();
    expect(statusOf('Refunding')).toBe('refunding');
  });
});

describe('figures', () => {
  it('share keeps two decimals and a missing share is a dash', () => {
    expect(shareText(365)).toBe('3.65');
    expect(shareText(667)).toBe('6.67');
    expect(shareText(1000)).toBe('10.00');
    expect(shareText(null)).toBe('—');
  });

  it('survival keeps one decimal, and nothing planted has none', () => {
    expect(survivalPercent(9686)).toBeCloseTo(96.9);
    expect(survivalPercent(null)).toBeNull();
  });

  it('the funded percent is whole, and a glyph stands for a fortieth of the planted trees', () => {
    expect(fundedPercent(6840)).toBe(68);
    expect(treesPerGlyph(984)).toBe('25');
    expect(treesPerGlyph(0)).toBe('0');
  });

  it('the planted share is capped at the target and safe on a target of zero', () => {
    const counts = { planted: 984, alive: 0, flagged: 0, dead: 0, removed: 0, completed: 0 };

    expect(plantedShare(counts, 1200)).toBeCloseTo(0.82);
    expect(plantedShare(counts, 500)).toBe(1);
    expect(plantedShare(counts, 0)).toBe(0);
  });

  it('health counts come in the order of the legend', () => {
    expect(
      healthCounts({ planted: 984, alive: 948, flagged: 2, dead: 20, removed: 14, completed: 0 }),
    ).toEqual([948, 2, 20, 14, 0]);
  });
});

describe('carbon', () => {
  it('a card with no estimate, no reservation and nothing issued has no carbon', () => {
    expect(hasNoCarbon(NOTHING)).toBe(true);
    expect(hasNoCarbon(ROOTS)).toBe(false);
  });

  it('writes each stage in tonnes, and a stage with nothing as a dash', () => {
    expect(carbonRows(ROOTS).map(([, units]) => carbonText(units))).toEqual([
      '8.005 tCO₂e',
      '0.533 tCO₂e',
      '0.000 tCO₂e',
      '0.000 tCO₂e',
    ]);
    expect(carbonText(null)).toBe('—');
  });
});

describe('homeView', () => {
  const idle = { pending: false, code: null, hasData: true, paused: false };

  it('draws the page once both reads have answered, empty when no campaign is supported', () => {
    expect(homeView([idle, idle], 3)).toBe('ready');
    expect(homeView([idle, idle], 0)).toBe('empty');
  });

  it('waits while a read is pending', () => {
    expect(homeView([{ ...idle, pending: true, hasData: false }, idle], undefined)).toBe('loading');
  });

  it('says the wallet is not ready before anything else', () => {
    expect(homeView([{ ...idle, code: 'wallet_missing', hasData: false }, idle], undefined)).toBe(
      'wallet',
    );
  });

  it('is a failure when a read failed with nothing cached, or the network is gone with nothing cached', () => {
    expect(
      homeView([{ ...idle, code: 'service_unavailable', hasData: false }, idle], undefined),
    ).toBe('error');
    expect(
      homeView([{ ...idle, pending: true, hasData: false, paused: true }, idle], undefined),
    ).toBe('error');
  });

  it('keeps the cards when only a later page failed', () => {
    expect(homeView([idle, { ...idle, code: 'invalid_cursor' }], 3)).toBe('ready');
  });
});

describe('readOf', () => {
  it('reads the code of an API error, and calls any other failure "network"', () => {
    const base = { isPending: false, data: undefined, fetchStatus: 'idle' };
    const refused = new ApiError({ code: 'wallet_missing', message: 'x', status: 403 });

    expect(readOf({ ...base, error: refused }).code).toBe('wallet_missing');
    expect(readOf({ ...base, error: new TypeError('Failed to fetch') }).code).toBe('network');
    expect(readOf({ ...base, error: null }).code).toBeNull();
  });
});
