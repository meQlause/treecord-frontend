import { describe, expect, it } from 'vitest';
import { safeReturn, signInUrl } from '../../../src/app/return-to';

describe('safeReturn (NFR-050)', () => {
  it.each([
    ['/app/profile', '/app/profile'],
    [
      '/campaigns/0x0000000000000000000000000000000000000003',
      '/campaigns/0x0000000000000000000000000000000000000003',
    ],
    ['/carbon?status=open', '/carbon?status=open'],
    ['/', '/'],
    ['https://evil.example', '/app'],
    ['//evil.example', '/app'],
    ['/\\evil.example', '/app'],
    ['/ok://still-not', '/app'],
    ['/a b', '/app'],
    ['campaigns', '/app'],
    ['', '/app'],
    [null, '/app'],
    [undefined, '/app'],
  ])('%j → %j', (value, expected) => {
    expect(safeReturn(value)).toBe(expected);
  });

  it('uses the fallback it is given', () => {
    expect(safeReturn('//evil.example', '/campaigns')).toBe('/campaigns');
  });
});

describe('signInUrl', () => {
  it('carries the page, query included, as one encoded value', () => {
    expect(signInUrl('/app/profile')).toBe('/sign-in?returnTo=%2Fapp%2Fprofile');
    expect(signInUrl('/app/jobs/9?x=1&y=2')).toBe(
      '/sign-in?returnTo=%2Fapp%2Fjobs%2F9%3Fx%3D1%26y%3D2',
    );
  });
});
