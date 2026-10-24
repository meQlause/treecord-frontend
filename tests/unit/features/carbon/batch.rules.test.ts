import { describe, expect, it } from 'vitest';
import {
  captionNote,
  issuedOn,
  journeySteps,
  priceText,
  serialSamples,
} from '../../../../src/features/carbon/batch.rules';
import type { BatchDetail } from '../../../../src/features/carbon/carbon.api';

const BATCH = {
  batchId: '101',
  registry: 'SRN PPI',
  vintage: 2025,
  serialStart: 'SRN-2025-00001',
  serialEnd: 'SRN-2025-16000',
  issuedAmount: '16000',
  inventoryAmount: '8400',
  campaign: { region: 'Cilacap, Central Java' },
} as unknown as BatchDetail;

describe('journeySteps', () => {
  it('names the five stops, the issuance after the registry and the last with the inventory', () => {
    expect(journeySteps(BATCH)).toEqual([
      ['Planted', 'Cilacap, Central Java'],
      ['Survival verified', 'Field evidence'],
      ['SRN PPI issuance', 'Vintage 2025'],
      ['Mirrored on-chain', 'Base Sepolia'],
      ['Available', '8.400 tCO₂e'],
    ]);
  });
});

describe('issuedOn', () => {
  it('is UTC with the time, whatever the zone of the viewer', () => {
    expect(issuedOn('2026-09-12T23:30:00.000Z')).toBe('12 Sept 2026, 23:30 UTC');
  });

  it('is the placeholder while the block time is not known', () => {
    expect(issuedOn(null)).toBe('Not available yet');
  });
});

describe('priceText', () => {
  it('prints a price, a zero price as 0 and no price as a dash', () => {
    expect(priceText('18500000')).toBe('18.5');
    expect(priceText('0')).toBe('0');
    expect(priceText(null)).toBe('—');
  });
});

describe('serialSamples', () => {
  it('runs the odometer from the first serial to the last, keeping the width', () => {
    expect(serialSamples(BATCH)).toEqual([
      'SRN-2025-00001',
      'SRN-2025-04000',
      'SRN-2025-08000',
      'SRN-2025-12000',
      'SRN-2025-16000',
    ]);
  });
});

describe('captionNote', () => {
  it('cuts a note over 28 characters to 27 and an ellipsis, and leaves a short one alone', () => {
    expect(captionNote('Cilacap, Central Java')).toBe('Cilacap, Central Java');
    expect(captionNote('Kabupaten Cilacap, Jawa Tengah, Indonesia')).toBe(
      'Kabupaten Cilacap, Jawa Ten…',
    );
  });
});
