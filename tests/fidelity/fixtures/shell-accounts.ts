// The accounts the shell criteria (docs/FE/features/shell.md §7) name beyond Sari: Alex the donor (accounts.md §1,
// wallet 0x71c7…976f) and Dewi the auditor. Same shape as `GET /me` (fixtures/accounts.ts).
import type { MeProfile } from './accounts';

export const ALEX: MeProfile = {
  id: 'edf80956-1114-443e-82d2-3311ce94e47e',
  walletAddress: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
  role: 'donor',
  displayName: 'Alex',
  isBuyer: false,
  carbonRightsAgreementAccepted: false,
  carbonRightsAcceptedAt: null,
  createdAt: '2026-10-23T03:12:44.512Z',
};

export const DEWI: MeProfile = {
  id: '7c1d5a52-6f0e-4b8a-9d1e-3a2b4c5d6e7f',
  walletAddress: '0x9a3c1e5f7b2d4a6c8e0f1a3b5c7d9e1f2a4b6c8d',
  role: 'auditor',
  displayName: 'Dewi',
  isBuyer: false,
  carbonRightsAgreementAccepted: false,
  carbonRightsAcceptedAt: null,
  createdAt: '2026-10-18T07:30:00.000Z',
};
