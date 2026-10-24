import { describe, expect, it } from 'vitest';
import type { CarbonBatch } from '../../../../src/features/carbon/carbon.api';
import {
  catalogView,
  filterBatches,
  isFiltered,
  litChips,
  parseRegistry,
  parseStatus,
  priceLine,
  registriesOf,
  sharePercent,
  withParam,
} from '../../../../src/features/carbon/carbon.rules';

const batch = (changes: Partial<CarbonBatch> = {}): CarbonBatch => ({
  batchId: '101',
  label: 'issued',
  campaign: {
    title: 'Back to the mangroves',
    region: 'Cilacap, Central Java',
    species: { name: 'Rhizophora mangrove' },
  },
  registry: 'SRN PPI',
  vintage: 2025,
  issuedAmount: '16000',
  inventoryAmount: '8400',
  usdcPerTonne: '18500000',
  availability: 'available',
  ...changes,
});

const SOLD_OUT = batch({
  batchId: '103',
  inventoryAmount: '0',
  usdcPerTonne: '17000000',
  availability: 'sold_out',
});
const VERRA = batch({
  batchId: '102',
  registry: 'Verra',
  campaign: { title: 'A forest, together', region: 'Magelang', species: { name: 'Mahogany' } },
});
const ALL = { status: 'All batches', registry: '', query: '' } as const;

describe('sharePercent and litChips', () => {
  it('round the share of the batch still on sale: 8400 of 16000 is 53 % and 5 chips', () => {
    expect(sharePercent(batch())).toBe(53);
    expect(litChips(batch())).toBe(5);
  });

  it('a sold-out batch has none, and a batch that issued nothing does not divide by zero', () => {
    expect(sharePercent(SOLD_OUT)).toBe(0);
    expect(litChips(batch({ issuedAmount: '0', inventoryAmount: '0' }))).toBe(0);
  });
});

describe('priceLine', () => {
  it('prints the price, and the sold-out suffix when the batch is sold out', () => {
    expect(priceLine(batch())).toBe('18.5 USDC / tonne');
    expect(priceLine(SOLD_OUT)).toBe('17 USDC / tonne · Sold out');
  });

  it('prints the availability when there is no usable price, without repeating it', () => {
    expect(priceLine(batch({ usdcPerTonne: '0', availability: 'sales_paused' }))).toBe(
      'Sales paused',
    );
    expect(priceLine(batch({ usdcPerTonne: null, availability: 'price_not_set' }))).toBe(
      'Price not set',
    );
    expect(priceLine(batch({ usdcPerTonne: null, availability: 'sold_out' }))).toBe('Sold out');
  });
});

describe('filterBatches', () => {
  const list = [VERRA, batch(), SOLD_OUT];

  it('filters by the server availability, the registry and the trimmed text, case-insensitively', () => {
    expect(filterBatches(list, { ...ALL, status: 'Sold out' })).toEqual([SOLD_OUT]);
    expect(filterBatches(list, { ...ALL, registry: 'Verra' })).toEqual([VERRA]);
    expect(filterBatches(list, { ...ALL, query: '  MANGROVE ' })).toHaveLength(2);
    expect(filterBatches(list, { ...ALL, query: 'central java' })).toHaveLength(2);
  });

  it('keeps the server order', () => {
    expect(filterBatches(list, ALL).map(({ batchId }) => batchId)).toEqual(['102', '101', '103']);
  });
});

describe('URL values', () => {
  it('an unknown status or registry is the default', () => {
    expect(parseStatus('Paused')).toBe('All batches');
    expect(parseStatus('Sold out')).toBe('Sold out');
    expect(parseRegistry('Gold Standard', ['Verra'])).toBe('');
    expect(parseRegistry('Verra', ['Verra'])).toBe('Verra');
  });

  it('lists each registry once, in list order', () => {
    expect(registriesOf([VERRA, batch(), SOLD_OUT])).toEqual(['Verra', 'SRN PPI']);
  });

  it('withParam never puts a default in the URL', () => {
    const params = new URLSearchParams('status=Sold%20out&q=x');

    expect(withParam(params, 'status', 'All batches').toString()).toBe('q=x');
    expect(withParam(params, 'q', '').toString()).toBe('status=Sold+out');
    expect(withParam(params, 'registry', 'Verra').get('registry')).toBe('Verra');
  });

  it('isFiltered counts the text trimmed', () => {
    expect(isFiltered(ALL)).toBe(false);
    expect(isFiltered({ ...ALL, query: '   ' })).toBe(false);
    expect(isFiltered({ ...ALL, query: 'a' })).toBe(true);
  });
});

describe('catalogView', () => {
  it('picks the page state from the query and the counts', () => {
    expect(catalogView({ isPending: false, isError: true }, 0, 0)).toBe('error');
    expect(catalogView({ isPending: true, isError: false }, 0, 0)).toBe('loading');
    expect(catalogView({ isPending: false, isError: false }, 0, 0)).toBe('empty');
    expect(catalogView({ isPending: false, isError: false }, 5, 0)).toBe('filtered-empty');
    expect(catalogView({ isPending: false, isError: false }, 5, 2)).toBe('ready');
  });
});
