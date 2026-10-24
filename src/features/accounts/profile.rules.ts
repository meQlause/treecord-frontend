// S11's pure rules (s11-profile.md §3 "Display rules", §4, §5, §6). No React here.
import { ApiError } from '../../shared/api/errors';
import type { Role } from '../../app/route-handle';
import type { Profile } from '../../app/session/session';
import type { SaveErrorKey } from './accounts.copy';

const NAME_MAX = 80;
const ID_CARD_NAME = 18;
const PASSPORT_NAME = 14;
const WALLET_CARD_NAME = 22;
const CUT = 1;

/** What the typed form holds (the draft persisted per account, wallet and chain). */
export type Draft = { displayName: string; isBuyer: boolean };

/** The fields `POST /profile` takes from "Save profile" (accounts.md §2), only the ones that changed. */
export type Changes = { displayName?: string; isBuyer?: boolean };

/** `name` cut at `max` characters with an ellipsis: the cards' own cuts (decorative; the heading keeps the full name). */
const cut = (name: string, max: number): string =>
  name.length > max ? `${name.slice(0, max - CUT)}…` : name;

export const idCardName = (name: string): string => cut(name, ID_CARD_NAME);

export const passportName = (name: string): string => cut(name, PASSPORT_NAME);

export const walletCardName = (name: string): string =>
  name.toUpperCase().slice(0, WALLET_CARD_NAME);

/** The form as the profile has it: the draft starts here (`displayName ?? ''`). */
export const draftOf = (profile: Pick<Profile, 'displayName' | 'isBuyer'>): Draft => ({
  displayName: profile.displayName ?? '',
  isBuyer: profile.isBuyer,
});

/** Only the fields that differ from the profile; the name is trimmed. Empty: nothing to send (PF-12). */
export const changesOf = (
  draft: Draft,
  profile: Pick<Profile, 'displayName' | 'isBuyer'>,
): Changes => {
  const displayName = draft.displayName.trim();

  return {
    ...(displayName !== (profile.displayName ?? '') ? { displayName } : {}),
    ...(draft.isBuyer !== profile.isBuyer ? { isBuyer: draft.isBuyer } : {}),
  };
};

/** "Save profile" needs a name that is not blank and not over 80 characters (FR-018). */
export const nameAcceptable = (displayName: string): boolean =>
  displayName.trim() !== '' && displayName.trim().length <= NAME_MAX;

/** The role a Donor or a Planter can switch to; auditors and operators have no switch (FR-020). */
export const switchTarget = (role: Role): 'planter' | 'donor' | null => {
  if (role === 'donor') {
    return 'planter';
  }

  return role === 'planter' ? 'donor' : null;
};

/** The D01 checkbox: becoming a planter without an earlier acceptance (FR-021). */
export const needsAgreement = (target: 'planter' | 'donor', accepted: boolean): boolean =>
  target === 'planter' && !accepted;

/** `POST /profile` body of a role switch: the acceptance goes with it only when it is being given now. */
export const switchBody = (
  target: 'planter' | 'donor',
  agreed: boolean,
): { role: string; carbonRightsAgreementAccepted?: true } => ({
  role: target,
  ...(agreed ? { carbonRightsAgreementAccepted: true as const } : {}),
});

/** `sessionStorage` key of the typed draft: by account, wallet and chain, so one account's never reaches another (NFR-051). */
export const draftKey = (profile: Pick<Profile, 'id' | 'walletAddress'>, chainId: number): string =>
  `treecord:draft:${profile.id}:${profile.walletAddress ?? 'no-wallet'}:${chainId}:profile`;

type Detail = { path?: unknown };

const namedField = (error: ApiError): boolean =>
  Array.isArray(error.details) &&
  (error.details as Detail[]).some(({ path }) => path === 'displayName');

/** s11 §5: which sentence a refused save or switch puts where. Anything not listed is a read failure to retry. */
export const failureOf = (error: unknown): SaveErrorKey => {
  if (!(error instanceof ApiError)) {
    return 'RETRY';
  }

  switch (error.code) {
    case 'validation_error':
      return namedField(error) ? 'NAME' : 'VALIDATION';
    case 'invalid_json':
      return 'INVALID_JSON';
    case 'agreement_required':
      return 'AGREEMENT';
    case 'role_locked':
      return 'LOCKED';
    default:
      return 'RETRY';
  }
};
