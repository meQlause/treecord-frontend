// docs/BE/features/carbon.md §1: the example bodies the S07 spec answers with — batches 102 and 101 as written, and the
// three the S07 spec names (103 sold out, 104 sales paused, 105 price not set).
import type { Json } from './campaigns';

const MAGELANG = {
  address: '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc',
  title: 'A forest, together',
  region: 'Magelang, Central Java',
  species: { code: 'SWIETENIA_MACROPHYLLA', name: 'Mahogany' },
};

const CILACAP = {
  address: '0x0000000000000000000000000000000000000006',
  title: 'Back to the mangroves',
  region: 'Cilacap, Central Java',
  species: { code: 'RHIZOPHORA_MUCRONATA', name: 'Rhizophora mangrove' },
};

const txOf = (hash: string): Json => ({ hash, url: null }); // local chain: no explorer (carbon.md shared values)

const BATCH_102: Json = {
  batchId: '102',
  label: 'issued',
  campaign: MAGELANG,
  registry: 'Verra',
  vintage: 2025,
  serialStart: 'VCS-2025-00001',
  serialEnd: 'VCS-2025-24000',
  issuedAmount: '24000',
  inventoryAmount: '12500',
  usdcPerTonne: '22000000',
  availability: 'available',
  issuedAt: '2026-09-18T08:00:00.000Z',
  issuedTx: txOf('0x4e7a1c9d3b5f2e8a0c6d4b2f9e1a7c3d5b8f0e2a4c6d9b1f3e5a7c0d2b4f6e8a'),
};

const BATCH_101: Json = {
  batchId: '101',
  label: 'issued',
  campaign: CILACAP,
  registry: 'SRN PPI',
  vintage: 2025,
  serialStart: 'SRN-2025-00001',
  serialEnd: 'SRN-2025-16000',
  issuedAmount: '16000',
  inventoryAmount: '8400',
  usdcPerTonne: '18500000',
  availability: 'available',
  issuedAt: '2026-09-12T08:00:00.000Z',
  issuedTx: txOf('0x1b8e3f5a7c9d0e2b4f6a8c1d3e5b7f9a0c2d4e6b8f1a3c5e7d9b0f2a4c6e8d1b'),
};

const BATCH_103: Json = {
  ...BATCH_101,
  batchId: '103',
  vintage: 2024,
  serialStart: 'SRN-2024-00001',
  serialEnd: 'SRN-2024-06000',
  issuedAmount: '6000',
  inventoryAmount: '0',
  usdcPerTonne: '17000000',
  availability: 'sold_out',
  issuedAt: '2026-08-12T08:00:00.000Z',
};

const BATCH_104: Json = {
  ...BATCH_102,
  batchId: '104',
  vintage: 2024,
  serialStart: 'VCS-2024-00001',
  serialEnd: 'VCS-2024-08000',
  issuedAmount: '8000',
  inventoryAmount: '3000',
  usdcPerTonne: '0',
  availability: 'sales_paused',
  issuedAt: '2026-08-18T08:00:00.000Z',
};

const BATCH_105: Json = {
  ...BATCH_102,
  batchId: '105',
  vintage: 2023,
  serialStart: 'VCS-2023-00001',
  serialEnd: 'VCS-2023-04000',
  issuedAmount: '4000',
  inventoryAmount: '2000',
  usdcPerTonne: null,
  availability: 'price_not_set',
  issuedAt: '2026-07-18T08:00:00.000Z',
};

/** The five batches of the S07 fixture, newest first (102 is newer than 101, SRS §3.6.9 #7). */
export const BATCHES: Json[] = [BATCH_102, BATCH_101, BATCH_103, BATCH_104, BATCH_105];

/** A `GET /carbon/batches` answer. */
export const batchesOf = (items: Json[], nextCursor: string | null = null): Json => ({
  items,
  nextCursor,
  total: items.length,
});
