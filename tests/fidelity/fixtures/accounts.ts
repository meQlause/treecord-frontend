// docs/BE/features/accounts.md §1: the GET /api/v1/me bodies the browser specs answer with.
export type MeProfile = {
  id: string;
  walletAddress: string | null;
  role: 'donor' | 'planter' | 'auditor' | 'operator';
  displayName: string | null;
  isBuyer: boolean;
  carbonRightsAgreementAccepted: boolean;
  carbonRightsAcceptedAt: string | null;
  createdAt: string;
};

/** Sari, a planter (S11 "PLANTER ACCOUNT", short wallet 0x4b9e…9d0e). */
export const SARI: MeProfile = {
  id: 'bfb15801-2dac-4f8d-ba18-5cc05c96f890',
  walletAddress: '0x4b9e2f1a7c3d05e6f8a91b2c3d4e5f6a7b8c9d0e',
  role: 'planter',
  displayName: 'Sari',
  isBuyer: false,
  carbonRightsAgreementAccepted: true,
  carbonRightsAcceptedAt: '2026-10-20T02:41:09.118Z',
  createdAt: '2026-10-17T08:15:30.402Z',
};

/** A first sign-in with an email never seen before, before Privy provisions the wallet (FR-005 #1, FR-003 #4). */
export const FIRST_SIGN_IN: MeProfile = {
  id: 'edf80956-1114-443e-82d2-3311ce94e47e',
  walletAddress: null,
  role: 'donor',
  displayName: null,
  isBuyer: false,
  carbonRightsAgreementAccepted: false,
  carbonRightsAcceptedAt: null,
  createdAt: '2026-10-23T03:12:44.512Z',
};

/** The body of `GET /me` for `profile`, with the changes a screen document names. */
export const meBody = (profile: MeProfile, changes: Partial<MeProfile> = {}) => ({
  profile: { ...profile, ...changes },
});
