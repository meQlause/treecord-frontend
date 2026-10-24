// s14-create-campaign.md §4, §7: the budget math to the base unit, what each step accepts, the geohash and the factory config.
import { describe, expect, it } from 'vitest';
import {
  INITIAL,
  amountsOf,
  configOf,
  geohash,
  openShare,
  totalShare,
  units,
  validate,
  type Draft,
} from '../../../../src/features/campaigns/create.rules';

const DAY = 86_400_000;
const NOW = Date.parse('2026-10-24T00:00:00Z');
const stamp = (days: number): string => new Date(NOW + days * DAY).toISOString().slice(0, 16);
const demak: Draft = {
  ...INITIAL,
  title: 'A new tide for Demak',
  species: 'RHIZOPHORA_MUCRONATA',
  region: 'Demak, Central Java',
  lat: '-6.894',
  lon: '110.638',
  funding: stamp(30),
  claim: stamp(60),
};
const CODES = ['RHIZOPHORA_MUCRONATA'];

describe('the budget', () => {
  it('floors each bucket and gives the rounding remainder to the reserve', () => {
    const target = units('10000.000001');

    expect(amountsOf(target, ['70', '10', '5', '10', '5'])).toEqual([
      BigInt(7_000_000_000),
      BigInt(1_000_000_000),
      BigInt(500_000_000),
      BigInt(1_000_000_001),
      BigInt(500_000_000),
    ]);
  });

  it('reads percentages to basis points exactly and refuses a third decimal', () => {
    expect(units('99.5', 2)).toBe(BigInt(9950));
    expect(units('1.005', 2)).toBeNull();
    expect(totalShare(['70', '10', '5', '10', '4.5'])).toBe('99.50');
    expect(openShare('25')).toBe('75.00%');
    expect(openShare('100.5')).toBe('—');
  });
});

describe('validate', () => {
  it('accepts the Demak inputs on both steps', () => {
    expect(validate(demak, 0, CODES, NOW)).toEqual({});
    expect(validate(demak, 1, CODES, NOW)).toEqual({});
  });

  it('names the failing fields of step 1', () => {
    const found = validate({ ...demak, title: '', radius: '50', lat: '91' }, 0, CODES, NOW);

    expect(Object.keys(found).sort()).toEqual(['lat', 'radius', 'title']);
  });

  it('refuses shares that do not total 100%, past deadlines and a zero per-tree incentive', () => {
    const found = validate(
      { ...demak, splits: ['70', '10', '5', '10', '4.5'], funding: stamp(-1), claim: stamp(-2) },
      1,
      CODES,
      NOW,
    );

    expect(Object.keys(found).sort()).toEqual(['claim', 'funding', 'splits']);
    expect(validate({ ...demak, target: '0.000999' }, 1, CODES, NOW).target).toMatch(/per tree/u);
  });
});

describe('the factory config', () => {
  it('is the geohash of a known point', () => {
    expect(geohash(57.64911, 10.40744)).toBe('u4pruyd');
  });

  it('carries bps, base units and Unix seconds', () => {
    const config = configOf({
      draft: demak,
      speciesCode: demak.species,
      metadataURI: 'ipfs://metadata',
      creator: '0x0000000000000000000000000000000000000001',
      timeUnit: 2_592_000,
    });

    expect(config.fundingTarget).toBe(BigInt(10_000_000_000));
    expect(config.anchorBps).toBe(2500);
    expect(config.split).toEqual({
      incentivesBps: 7000,
      seedlingsBps: 1000,
      verificationBps: 500,
      reserveBps: 1000,
      feeBps: 500,
    });
    expect(config.fundingDeadline).toBe(BigInt(Math.floor(Date.parse(demak.funding) / 1000)));
  });
});
