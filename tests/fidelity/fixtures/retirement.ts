// docs/BE/features/carbon.md §5: the example body the S09 spec answers with (retirement "1", 500 units for PT Hijau
// Lestari, batch 101, "Back to the mangroves", registry status pending).
import type { Json } from './campaigns';

const BATCH: Json = {
  batchId: '101',
  registry: 'SRN PPI',
  vintage: 2025,
  serialStart: 'SRN-2025-00001',
  serialEnd: 'SRN-2025-16000',
  issuedAmount: '16000',
  issuedTx: {
    hash: '0x1b8e3f5a7c9d0e2b4f6a8c1d3e5b7f9a0c2d4e6b8f1a3c5e7d9b0f2a4c6e8d1b',
    url: 'https://sepolia.basescan.org/tx/0x1b8e3f5a7c9d0e2b4f6a8c1d3e5b7f9a0c2d4e6b8f1a3c5e7d9b0f2a4c6e8d1b',
  },
};

export const CAMPAIGN_ADDRESS = '0x0000000000000000000000000000000000000006';

const RETIREMENT: Json = {
  retirementId: '1',
  label: 'issued',
  amount: '500',
  beneficiary: 'PT Hijau Lestari',
  purpose: '2026 scope 3 offset',
  retiredAt: '2026-09-20T08:00:00.000Z',
  holder: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9f0e',
  txHash: '0x2d5f8b1e4a7c0d3f6b9e2a5c8f1d4b7e0a3c6f9d2b5e8a1c4f7d0b3e6a9c2f5d',
  registryRetirement: { status: 'pending', reference: null },
  batch: BATCH,
  campaign: {
    address: CAMPAIGN_ADDRESS,
    title: 'Back to the mangroves',
    region: { name: 'Cilacap, Central Java', geohash: 'qqguwvt' },
    species: { code: 'RHIZOPHORA_MUCRONATA', name: 'Rhizophora mangrove' },
    treeTarget: 900,
  },
};

/** The `GET /carbon/retirements/:id` body with `changes` laid over it. */
export const retirement = (changes: Json = {}): Json => ({ ...RETIREMENT, ...changes });

/** The same body with `changes` laid over its batch. */
export const withBatch = (changes: Json): Json => retirement({ batch: { ...BATCH, ...changes } });
