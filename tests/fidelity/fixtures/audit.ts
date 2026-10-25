// docs/BE/features/audit.md §1-§3: the answers the S23-S26 specs serve — the auditor's two sessions (the closed `868c029f-…`
// and the open `e9219997-…`), the 201 of opening one, and the open session as S24 reads it. Fixtures are the contract's examples.
import { SARI, type MeProfile } from './accounts';
import type { Json } from './campaigns';

export const AUDITOR: MeProfile = {
  ...SARI,
  id: '5f0c2a9e-8d41-4b7a-9c3e-1a6d2f8b4e70',
  role: 'auditor',
  displayName: 'Dewi',
};

export const CLOSED_ID = '868c029f-2a97-4721-b005-f66b88e3768b';

export const OPEN_ID = 'e9219997-5281-4602-b694-f3c4b08cf7c3';

export const CAMPAIGN_ADDRESS = '0x0000000000000000000000000000000000000003';

const CAMPAIGN = { address: CAMPAIGN_ADDRESS, title: 'Kalimantan Mangrove Restoration' };

const POPULATION = ['3001', '3020', '3021', '3091', '3092', '3103', '3104'];

export const CLOSED_ITEM: Json = {
  id: CLOSED_ID,
  status: 'closed',
  campaign: CAMPAIGN,
  seedBlockNumber: '17000001',
  populationSize: 7,
  sampleSize: 2,
  populationPreview: POPULATION,
  sample: ['3091', '3001'],
  findingsRecorded: 2,
  challengesIssued: 0,
  reportHash: '0x97eb3c933091e9f179119cb8a4396c7301c1ccc911fa4573ccce6ffd1d2c5341',
  createdAt: '2026-10-21T05:00:00.000Z',
  closedAt: '2026-10-21T06:00:00.000Z',
};

export const OPEN_ITEM: Json = {
  id: OPEN_ID,
  status: 'open',
  campaign: CAMPAIGN,
  seedBlockNumber: '17000015',
  populationSize: 7,
  sampleSize: 3,
  populationPreview: POPULATION,
  sample: ['3001', '3091', '3104'],
  findingsRecorded: 1,
  challengesIssued: 2,
  reportHash: null,
  createdAt: '2026-10-21T03:30:00.000Z',
  closedAt: null,
};

/** `GET /audit/sessions` for the items given. */
export const sessionsOf = (items: Json[], nextCursor: string | null = null): Json => ({
  items,
  nextCursor,
  total: items.length,
});

/** `GET /campaigns`: the one campaign the select offers. */
export const CAMPAIGNS: Json = { items: [CAMPAIGN], nextCursor: null, total: 1 };

const SEED = {
  blockNumber: '17000015',
  blockHash: '0x39e41cfd9e316d39bb6ad8058c9cfbbb2d19fa7938c68e1e32009e56e735a4cd',
  seed: '0x09c2dea7c3ba4fc471025dabff6ef8967bbe0efb0c99a832da02e3e8f0d75778',
};

const sample = (position: number, treeId: string, changes: Json = {}): Json => ({
  position,
  treeId,
  treeStatus: 'alive',
  finding: null,
  notes: null,
  recordedAt: null,
  challenge: null,
  ...changes,
});

/** The session as just opened (201) and as S24 reads it before any finding. */
export const OPENED: Json = {
  id: OPEN_ID,
  status: 'open',
  campaign: { ...CAMPAIGN, regionName: 'East Kalimantan' },
  seed: SEED,
  population: POPULATION,
  sampleSize: 3,
  samples: [sample(0, '3001'), sample(1, '3091', { treeStatus: 'flagged' }), sample(2, '3104')],
  findingsRecorded: 0,
  challengesIssued: 0,
  reportHash: null,
  createdAt: '2026-10-21T03:30:00.000Z',
  closedAt: null,
};
