import { describe, expect, it } from 'vitest';
import { artForSpecies } from '../../../../src/features/campaigns/art';

describe('artForSpecies', () => {
  it.each([
    ['RHIZOPHORA_MUCRONATA', 'coast'],
    ['FALCATARIA_FALCATA', 'grove'],
    ['SWIETENIA_MACROPHYLLA', 'forest'],
    ['DURIO_ZIBETHINUS', 'orchard'],
    ['PERSEA_AMERICANA', 'avocado'],
  ])('%s draws %s', (code, kind) => {
    expect(artForSpecies(code)).toBe(kind);
  });

  it('draws forest for a campaign without species or with an unknown one', () => {
    expect(artForSpecies(null)).toBe('forest');
    expect(artForSpecies(undefined)).toBe('forest');
    expect(artForSpecies('NEW_SPECIES')).toBe('forest');
  });
});
