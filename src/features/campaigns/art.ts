import type { PhotoKind } from '../../shared/art/Photo';

// s03-campaigns.md §2 "Art": the API has no art field, so the picture follows the species (the mockup's species-index
// order, create-campaign.jsx:66). One map for S03, S04, S05, S13 and S14. A campaign without a species draws `forest`.
const ART: Readonly<Record<string, PhotoKind>> = {
  RHIZOPHORA_MUCRONATA: 'coast',
  FALCATARIA_FALCATA: 'grove',
  SWIETENIA_MACROPHYLLA: 'forest',
  DURIO_ZIBETHINUS: 'orchard',
  PERSEA_AMERICANA: 'avocado',
};

export const artForSpecies = (code: string | null | undefined): PhotoKind =>
  ART[code ?? ''] ?? 'forest';
