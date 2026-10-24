import { describe, expect, it } from 'vitest';
import {
  MILESTONE_MONTHS,
  eventLabel,
  healthCounts,
  isAddress,
  plantedShare,
  share,
  statusLabel,
  survivalPercent,
  wholePercent,
} from '../../../../src/features/reports/report.rules';

describe('isAddress', () => {
  it('accepts 0x and 40 hex digits of any case', () => {
    expect(isAddress('0x0000000000000000000000000000000000000003')).toBe(true);
    expect(isAddress('0xABCDEFabcdef0000000000000000000000000003')).toBe(true);
  });

  it.each(['', '0x03', '0x000000000000000000000000000000000000000g', '00'.repeat(21)])(
    'refuses %j',
    (value) => {
      expect(isAddress(value)).toBe(false);
    },
  );
});

describe('percentages', () => {
  it('survival is bps / 100 to one decimal, null stays null', () => {
    expect(survivalPercent(9654)).toBe(96.5);
    expect(survivalPercent(10000)).toBe(100);
    expect(survivalPercent(null)).toBeNull();
  });

  it('whole percent rounds, caps at 100 and reads null as 0', () => {
    expect(wholePercent(1666)).toBe(17);
    expect(wholePercent(10000)).toBe(100);
    expect(wholePercent(12000)).toBe(100);
    expect(wholePercent(null)).toBe(0);
  });

  it('share is 0 to 1', () => {
    expect(share(2500)).toBe(0.25);
    expect(share(20000)).toBe(1);
    expect(share(null)).toBe(0);
  });

  it('planted share guards a target of 0', () => {
    expect(plantedShare(984, 1200)).toBeCloseTo(0.82);
    expect(plantedShare(5, 0)).toBe(0);
    expect(plantedShare(2000, 1200)).toBe(1);
  });
});

describe('eventLabel', () => {
  it('names the four kinds and the month of a check-in', () => {
    expect(eventLabel('planted', 0)).toBe('Tree planted');
    expect(eventLabel('check_in', 3)).toBe('Survival check · month 3');
    expect(eventLabel('check_in', null)).toEqual({ copyId: 'COPY-171' });
    expect(eventLabel('died', null)).toEqual({ copyId: 'COPY-169' });
    expect(eventLabel('replanted', null)).toEqual({ copyId: 'COPY-170' });
  });

  it('reads an unknown kind as words', () => {
    expect(eventLabel('flag_resolved', null)).toBe('flag resolved');
  });
});

describe('small helpers', () => {
  it('capitalises the status for the badge', () => {
    expect(statusLabel('active')).toBe('Active');
  });

  it('orders the legend alive, flagged, dead, removed, completed', () => {
    expect(healthCounts({ alive: 5, flagged: 4, dead: 3, removed: 2, completed: 1 })).toEqual([
      5, 4, 3, 2, 1,
    ]);
  });

  it('places six milestone months', () => {
    expect(MILESTONE_MONTHS).toEqual([0, 3, 6, 12, 24, 36]);
  });
});
