import { describe, expect, it } from 'vitest';
import { LANDING, legacyTarget } from '../../../src/app/legacy-route';

describe('legacyTarget (shell.md §6)', () => {
  it.each([
    ['http://app.test/', LANDING],
    ['http://app.test/#/campaigns', '/campaigns'],
    ['http://app.test/#/sign-in', '/sign-in'],
    ['http://app.test/#/campaigns?status=Active', '/campaigns?status=Active'],
    ['http://app.test/#', '/campaigns'],
    ['http://app.test/#/', '/campaigns'],
    ['http://app.test/#campaigns', '/campaigns'],
    ['http://app.test/#//evil.example', '/campaigns'],
  ])('%s → %s', (href, expected) => {
    expect(legacyTarget(href)).toBe(expected);
  });
});
