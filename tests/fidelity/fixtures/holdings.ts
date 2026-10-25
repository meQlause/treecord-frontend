// docs/BE/features/carbon.md §3: the `GET /carbon/holdings` example the S15 spec answers with (wallet 0x71c7…976f; two
// reservations, batch 101 with 0.400 retired, retirement "2" for PT Hijau Lestari) and the planter's empty body.
import type { Json } from './campaigns';

export const MANGROVES: Json = {
  address: '0x0000000000000000000000000000000000000006',
  title: 'Back to the mangroves',
  region: 'Cilacap, Central Java',
  species: { code: 'RHIZOPHORA_MUCRONATA', name: 'Rhizophora mangrove' },
};

const ROOTS: Json = {
  address: '0x0000000000000000000000000000000000000003',
  title: 'Roots that stay',
  region: 'Banyumas, Central Java',
  species: { code: 'SWIETENIA_MACROPHYLLA', name: 'Mahogany' },
};

const UPDATED = '2026-09-18T08:00:00.000Z';

export const MANGROVES_RESERVATION: Json = {
  campaign: MANGROVES,
  label: 'pre-certification',
  reservedAmount: '2000',
  allocatedAmount: '1600',
  unfilledAmount: '400',
  declined: false,
  updatedAt: UPDATED,
};

/** Roots that stay never touches the chain in the specs: only its card and its 0.533 of "Reserved". */
export const ROOTS_RESERVATION: Json = {
  campaign: ROOTS,
  label: 'pre-certification',
  reservedAmount: '533',
  allocatedAmount: '0',
  unfilledAmount: '533',
  declined: false,
  updatedAt: UPDATED,
};

/** Batch 101 as the wallet holds it: `amount` still to retire, `retiredAmount` already retired. */
export const balance = (
  amount: string,
  retiredAmount: string,
  campaign: Json = MANGROVES,
  batchId = '101',
): Json => ({
  batchId,
  label: 'issued',
  campaign: { address: campaign.address, title: campaign.title, region: campaign.region },
  registry: 'SRN PPI',
  vintage: 2025,
  serialStart: 'SRN-2025-00001',
  serialEnd: 'SRN-2025-16000',
  amount,
  retiredAmount,
});

export const retiredItem = (retirementId: string, amount = '400'): Json => ({
  retirementId,
  batchId: '101',
  registry: 'SRN PPI',
  amount,
  beneficiary: 'PT Hijau Lestari',
  purpose: '2026 scope 3 offset',
  retiredAt: '2026-09-20T08:00:00.000Z',
  txHash: `0x${retirementId.padStart(64, '7')}`,
  registryRetirement: { status: 'pending', reference: null },
});

export const page = (items: Json[], total: number, nextCursor: string | null = null): Json => ({
  items,
  nextCursor,
  total,
});

export const HOLDINGS: Json = {
  wallet: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
  summary: {
    issuedAmount: '1200',
    allocatedAmount: '1600',
    unfilledAmount: '933',
    retiredAmount: '400',
  },
  reservations: [MANGROVES_RESERVATION, ROOTS_RESERVATION],
  balances: [balance('1200', '400')],
  retirements: page([retiredItem('2')], 1),
};

/** What a planter reads (FR-212): zero figures and three empty lists. */
export const PLANTER_HOLDINGS: Json = {
  wallet: HOLDINGS.wallet,
  summary: { issuedAmount: '0', allocatedAmount: '0', unfilledAmount: '0', retiredAmount: '0' },
  reservations: [],
  balances: [],
  retirements: page([], 0),
};
