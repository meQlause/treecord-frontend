import { describe, expect, it } from 'vitest';
import {
  barPercent,
  cardMeta,
  catalogView,
  filterState,
  flattenPages,
  parseRegion,
  parseStatus,
  percentOf,
  requestFilters,
  usdc,
  withParam,
} from '../../../../src/features/campaigns/campaigns.rules';

const SPECIES = [
  { code: 'FALCATARIA_FALCATA', name: 'Sengon' },
  { code: 'DURIO_ZIBETHINUS', name: 'Durian' },
];

const DEFAULTS = { status: 'All campaigns', species: '', region: '' } as const;

describe('usdc', () => {
  it.each([
    ['6840000000', '6,840'],
    ['17500000', '17.5'],
    ['0', '0'],
    ['1', '0.000001'],
    ['10000000001', '10,000.000001'],
    ['9007199254740993000000', '9,007,199,254,740,993'],
  ])('%s base units read %s', (units, text) => {
    expect(usdc(units)).toBe(text);
  });
});

describe('percentages', () => {
  it('rounds basis points to the printed percent and keeps the exact share for the bar', () => {
    expect(percentOf(6840)).toBe(68);
    expect(percentOf(5250)).toBe(53);
    expect(barPercent(6840)).toBeCloseTo(68.4);
  });
});

describe('the URL filters', () => {
  it('falls back to All campaigns for an unknown status', () => {
    expect(parseStatus('Active')).toBe('Active');
    expect(parseStatus('Paused')).toBe('All campaigns');
    expect(parseStatus(null)).toBe('All campaigns');
  });

  it('trims the region and cuts it at 120 characters', () => {
    expect(parseRegion('  java ')).toBe('java');
    expect(parseRegion('   ')).toBeUndefined();
    expect(parseRegion(null)).toBeUndefined();
    expect(parseRegion('a'.repeat(130))).toHaveLength(120);
  });

  it('sends the lower-case status and the code of the named species, nothing for a default', () => {
    const url = { status: 'Active', species: 'Sengon', region: 'java' } as const;

    expect(requestFilters(url, SPECIES)).toEqual({
      status: 'active',
      species: 'FALCATARIA_FALCATA',
      region: 'java',
    });
    expect(requestFilters(DEFAULTS, SPECIES)).toEqual({
      status: undefined,
      species: undefined,
      region: undefined,
    });
    expect(requestFilters({ ...DEFAULTS, species: 'Teak' }, SPECIES).species).toBeUndefined();
  });

  it('knows when the request must wait for the species list and when a filter is active', () => {
    const named = { ...DEFAULTS, species: 'Teak' };
    const known = { status: undefined, species: 'FALCATARIA_FALCATA', region: undefined };

    expect(filterState(named, requestFilters(named, SPECIES), SPECIES)).toEqual({
      selectedSpecies: '',
      active: false,
      waiting: false,
    });
    expect(filterState(named, requestFilters(named, undefined), undefined).waiting).toBe(true);
    expect(filterState({ ...DEFAULTS, species: 'Sengon' }, known, SPECIES)).toMatchObject({
      selectedSpecies: 'Sengon',
      active: true,
    });
  });

  it('sets a param and drops it for the defaults', () => {
    const base = new URLSearchParams('status=Active&region=java');

    expect(withParam(base, 'species', 'Sengon').toString()).toBe(
      'status=Active&region=java&species=Sengon',
    );
    expect(withParam(base, 'status', 'All campaigns').toString()).toBe('region=java');
    expect(withParam(base, 'region', '').toString()).toBe('status=Active');
  });
});

describe('cardMeta', () => {
  it('reads the deadline while funding and the status otherwise', () => {
    expect(cardMeta({ status: 'funding', daysLeft: 18 })).toBe('18 days left');
    expect(cardMeta({ status: 'funding', daysLeft: null })).toBe('Deadline passed');
    expect(cardMeta({ status: 'active', daysLeft: null })).toBe('Growing now');
    expect(cardMeta({ status: 'completed', daysLeft: null })).toBe('Commitment complete');
    expect(cardMeta({ status: 'refunding', daysLeft: null })).toBe('Funding ended');
  });
});

describe('catalogView', () => {
  const base = { failed: false, pending: false, paused: false, total: 3, filtered: false };

  it.each([
    [{ failed: true }, 'error'],
    [{ pending: true, paused: true }, 'error'],
    [{ pending: true }, 'loading'],
    [{ total: undefined }, 'loading'],
    [{}, 'ready'],
    [{ total: 0 }, 'empty'],
    [{ total: 0, filtered: true }, 'filtered-empty'],
  ])('%j is %s', (changes, view) => {
    expect(catalogView({ ...base, ...changes })).toBe(view);
  });
});

describe('flattenPages', () => {
  it('joins the pages and takes the newest total', () => {
    const one = { items: [{ address: 'a' }], total: 3 };
    const two = { items: [{ address: 'b' }], total: 4 };
    const flat = flattenPages([one, two] as never);

    expect(flat.items).toHaveLength(2);
    expect(flat.total).toBe(4);
    expect(flattenPages(undefined)).toEqual({ items: [], total: undefined });
  });
});
