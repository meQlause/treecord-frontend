import { describe, expect, it } from 'vitest';
import { ApiError, classOf, errorFromResponse } from '../../../../src/shared/api/errors';

describe('classOf', () => {
  it.each([
    ['validation_error', 'field'],
    ['no_trees', 'field'],
    ['invalid_cursor', 'advisory'],
    ['forbidden_role', 'screen'],
    ['not_found', 'screen'],
    ['missing_token', 'navigation'],
    ['invalid_token', 'navigation'],
    ['service_unavailable', 'retry'],
    ['network', 'retry'],
    ['timeout', 'retry'],
    ['claim_window_closed', 'blocking'],
    ['a_code_nobody_registered', 'blocking'],
  ] as const)('%s is %s', (code, expected) => {
    expect(classOf(code)).toBe(expected);
  });
});

describe('errorFromResponse', () => {
  it('keeps code, message, details and request id', () => {
    const error = errorFromResponse(409, {
      error: { code: 'idempotency_key_reused', message: 'Reused', requestId: 'r1' },
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'idempotency_key_reused',
      message: 'Reused',
      requestId: 'r1',
      status: 409,
    });
    expect(error.details).toBeUndefined();
    expect(error.class).toBe('blocking');
  });

  it.each([undefined, null, 'oops', {}, { error: {} }, { error: { code: 5, message: 'x' } }])(
    'answers internal_error for %j',
    (body) => {
      expect(errorFromResponse(500, body)).toMatchObject({ code: 'internal_error', status: 500 });
    },
  );
});
