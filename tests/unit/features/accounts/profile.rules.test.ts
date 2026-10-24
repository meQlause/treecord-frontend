import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../../src/shared/api/errors';
import {
  changesOf,
  draftKey,
  draftOf,
  failureOf,
  idCardName,
  nameAcceptable,
  needsAgreement,
  passportName,
  switchBody,
  switchTarget,
  walletCardName,
} from '../../../../src/features/accounts/profile.rules';

const ALEX = { displayName: 'Alex', isBuyer: false };

const refused = (code: string, details?: unknown) =>
  new ApiError({ code, message: code, status: 400, ...(details === undefined ? {} : { details }) });

describe('changesOf', () => {
  it('sends only what differs, with the name trimmed', () => {
    expect(changesOf({ displayName: '  Alex Tan  ', isBuyer: false }, ALEX)).toEqual({
      displayName: 'Alex Tan',
    });
    expect(changesOf({ displayName: 'Alex', isBuyer: true }, ALEX)).toEqual({ isBuyer: true });
    expect(changesOf({ displayName: 'Alex T', isBuyer: true }, ALEX)).toEqual({
      displayName: 'Alex T',
      isBuyer: true,
    });
  });

  it('sends nothing when the form is the profile', () => {
    expect(changesOf(draftOf(ALEX), ALEX)).toEqual({});
    expect(changesOf({ displayName: ' Alex ', isBuyer: false }, ALEX)).toEqual({});
  });

  it('treats a missing name as an empty one, so an untouched form changes nothing', () => {
    expect(
      changesOf(draftOf({ displayName: null, isBuyer: false }), {
        displayName: null,
        isBuyer: false,
      }),
    ).toEqual({});
  });
});

describe('nameAcceptable', () => {
  it('needs 1 to 80 characters after trimming', () => {
    expect(nameAcceptable('   ')).toBe(false);
    expect(nameAcceptable(' A ')).toBe(true);
    expect(nameAcceptable('x'.repeat(80))).toBe(true);
    expect(nameAcceptable('x'.repeat(81))).toBe(false);
  });
});

describe('the role switch', () => {
  it('only a donor and a planter can switch, to each other', () => {
    expect(switchTarget('donor')).toBe('planter');
    expect(switchTarget('planter')).toBe('donor');
    expect(switchTarget('auditor')).toBeNull();
    expect(switchTarget('operator')).toBeNull();
  });

  it('asks for the agreement only when becoming a planter without an earlier acceptance', () => {
    expect(needsAgreement('planter', false)).toBe(true);
    expect(needsAgreement('planter', true)).toBe(false);
    expect(needsAgreement('donor', false)).toBe(false);
  });

  it('sends the acceptance only when it is given now, and never false', () => {
    expect(switchBody('planter', true)).toEqual({
      role: 'planter',
      carbonRightsAgreementAccepted: true,
    });
    expect(switchBody('planter', false)).toEqual({ role: 'planter' });
    expect(switchBody('donor', false)).toEqual({ role: 'donor' });
  });
});

describe('draftKey', () => {
  it('is by account, wallet and chain, with a stand-in for a wallet not ready', () => {
    expect(draftKey({ id: 'u1', walletAddress: '0xabc' }, 84532)).toBe(
      'treecord:draft:u1:0xabc:84532:profile',
    );
    expect(draftKey({ id: 'u1', walletAddress: null }, 84532)).toBe(
      'treecord:draft:u1:no-wallet:84532:profile',
    );
  });
});

describe('failureOf', () => {
  it('puts a refusal of the name under the field and any other refusal in the form', () => {
    expect(failureOf(refused('validation_error', [{ path: 'displayName' }]))).toBe('NAME');
    expect(failureOf(refused('validation_error', [{ path: 'isBuyer' }]))).toBe('VALIDATION');
    expect(failureOf(refused('validation_error'))).toBe('VALIDATION');
    expect(failureOf(refused('invalid_json'))).toBe('INVALID_JSON');
  });

  it('names the two refusals of a role switch, and retries everything else', () => {
    expect(failureOf(refused('agreement_required'))).toBe('AGREEMENT');
    expect(failureOf(refused('role_locked'))).toBe('LOCKED');
    expect(failureOf(refused('service_unavailable'))).toBe('RETRY');
    expect(failureOf(new TypeError('Failed to fetch'))).toBe('RETRY');
  });
});

describe('the cards cut the name where the mockup does', () => {
  it('IdCard at 18, PassportArt at 14 and WalletCard at 22 characters', () => {
    expect(idCardName('x'.repeat(18))).toBe('x'.repeat(18));
    expect(idCardName('x'.repeat(19))).toBe(`${'x'.repeat(17)}…`);
    expect(passportName('x'.repeat(15))).toBe(`${'x'.repeat(13)}…`);
    expect(walletCardName('alex tan'.repeat(5))).toBe('ALEX TANALEX TANALEX T');
  });
});
