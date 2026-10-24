// S22's pure rules (s22-device.md §1 "Key state", §2, §5). No React here.
import { ApiError } from '../../shared/api/errors';
import { localDate } from '../../shared/format/datetime';
import type { KeyRecord } from '../evidence/device-key';
import type { ActiveDevice } from './device.api';
import type { ErrorKey } from './device.copy';

const GROUP = 4;
const FIRST_LINE = 6;
const KEY_ID_LENGTH = 12;
const CARD_LABEL_MAX = 16;
const CARD_LABEL_CUT = 15;

export type KeyState = 'ready' | 'stale' | 'missing' | 'none';

/**
 * FR-119: which card to draw from the key this browser holds and the active devices the server lists. A key the server does
 * not list was revoked elsewhere or never accepted: it can never sign again, so it is `stale` and gets deleted. With the
 * list not loaded (offline, an error) a local key is trusted as it is.
 */
export const keyState = (
  record: KeyRecord | null | undefined,
  devices: readonly ActiveDevice[] | undefined,
): KeyState => {
  if (record !== null && record !== undefined) {
    return devices === undefined ||
      devices.some(({ thumbprint }) => thumbprint === record.thumbprint)
      ? 'ready'
      : 'stale';
  }

  return devices !== undefined && devices.length > 0 ? 'missing' : 'none';
};

/** The thumbprint in groups of four: six on the first line of the card, the rest on the second. */
export const thumbprintLines = (thumbprint: string): [string, string] => {
  const groups = thumbprint.match(new RegExp(`.{1,${GROUP}}`, 'g')) ?? [];

  return [groups.slice(0, FIRST_LINE).join(' '), groups.slice(FIRST_LINE).join(' ')];
};

/** "x3Jd9kQpT2aB…": the first twelve characters of the key id. */
export const keyIdShort = (thumbprint: string): string => `${thumbprint.slice(0, KEY_ID_LENGTH)}…`;

/** The label on the card, cut at 16 characters (the mockup's own cut). */
export const cardLabel = (label: string): string =>
  label.length > CARD_LABEL_MAX ? `${label.slice(0, CARD_LABEL_CUT)}…` : label;

/** "23 OCT 2026" in the viewer's zone, for "CREATED …". */
export const createdDate = (createdAt: string): string => localDate(createdAt).toUpperCase();

/** What a refused register says (s22 §5); anything not listed is "could not reach the server" (COPY-214). */
export const registerFailure = (error: unknown): ErrorKey => {
  if (!(error instanceof ApiError)) {
    return 'FAILED';
  }

  switch (error.code) {
    case 'device_limit_reached':
      return 'LIMIT';
    case 'device_already_registered':
      return 'ALREADY';
    case 'validation_error':
      return 'FIELD';
    case 'invalid_json':
      return 'INVALID_JSON';
    default:
      return 'FAILED';
  }
};

/** A revoke whose target the server no longer knows (404, or a corrupt local id) means the local record is stale. */
export const revokeTargetGone = (error: unknown): boolean =>
  error instanceof ApiError && (error.code === 'not_found' || error.code === 'invalid_path');
