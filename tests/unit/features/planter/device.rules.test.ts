import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../../src/shared/api/errors';
import type { KeyRecord } from '../../../../src/features/evidence/device-key';
import type { ActiveDevice } from '../../../../src/features/planter/device.api';
import {
  cardLabel,
  createdDate,
  keyIdShort,
  keyState,
  registerFailure,
  revokeTargetGone,
  thumbprintLines,
} from '../../../../src/features/planter/device.rules';

const THUMBPRINT = 'x3Jd9kQpT2aBvR7mN4cY8wLs1eFhGz6uK0oPiXjVbQs';
const RECORD = { thumbprint: THUMBPRINT } as KeyRecord;
const LISTED = [{ thumbprint: THUMBPRINT }] as ActiveDevice[];

const refused = (code: string) => new ApiError({ code, message: code, status: 409 });

describe('keyState', () => {
  it('is ready when the key here is in the list, or when the list could not be loaded', () => {
    expect(keyState(RECORD, LISTED)).toBe('ready');
    expect(keyState(RECORD, undefined)).toBe('ready');
  });

  it('is stale when the key here is not in a loaded list: it can never sign again', () => {
    expect(keyState(RECORD, [])).toBe('stale');
    expect(keyState(RECORD, [{ thumbprint: 'other' }] as ActiveDevice[])).toBe('stale');
  });

  it('is missing when the account lists a device and this browser has no key, none when neither', () => {
    expect(keyState(null, LISTED)).toBe('missing');
    expect(keyState(null, [])).toBe('none');
    expect(keyState(null, undefined)).toBe('none');
  });
});

describe('the card text', () => {
  it('puts six groups of four on the first line and five on the second', () => {
    expect(thumbprintLines(THUMBPRINT)).toEqual([
      'x3Jd 9kQp T2aB vR7m N4cY 8wLs',
      '1eFh Gz6u K0oP iXjV bQs',
    ]);
  });

  it('shortens the key id to twelve characters, and the label at sixteen', () => {
    expect(keyIdShort(THUMBPRINT)).toBe('x3Jd9kQpT2aB…');
    expect(cardLabel('Pixel 8')).toBe('Pixel 8');
    expect(cardLabel('A very long device label')).toBe('A very long dev…');
  });

  it('writes the creation date in capitals', () => {
    expect(createdDate('2026-10-23T03:20:15.067Z')).toMatch(/^23 OCT 2026$/);
  });
});

describe('registerFailure and revokeTargetGone', () => {
  it('names the refusals of a register and calls everything else a failure to reach the server', () => {
    expect(registerFailure(refused('device_limit_reached'))).toBe('LIMIT');
    expect(registerFailure(refused('device_already_registered'))).toBe('ALREADY');
    expect(registerFailure(refused('validation_error'))).toBe('FIELD');
    expect(registerFailure(refused('invalid_json'))).toBe('INVALID_JSON');
    expect(registerFailure(refused('service_unavailable'))).toBe('FAILED');
    expect(registerFailure(new TypeError('Failed to fetch'))).toBe('FAILED');
  });

  it('a revoke the server no longer knows (404, or a corrupt id) means the local record is stale', () => {
    expect(revokeTargetGone(refused('not_found'))).toBe(true);
    expect(revokeTargetGone(refused('invalid_path'))).toBe(true);
    expect(revokeTargetGone(refused('service_unavailable'))).toBe(false);
  });
});
