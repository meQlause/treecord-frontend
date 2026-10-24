// The pure half of fidelity.setup.ts; harness.spec.ts proves the same conditions in Chromium.
import { describe, expect, it } from 'vitest';
import {
  FROZEN_CLOCK,
  clockFor,
  contextOptions,
  expectNoBlocked,
  isAllowed,
  timezoneFor,
} from './fidelity.setup';
import { VIEWPORTS } from './matrix';

describe('fidelity.setup', () => {
  it.each(['S16', 'S18', 'S20', 'S23', 'S24', 'S25', 'S26'])('%s formats in UTC', (id) => {
    expect(timezoneFor({ id })).toBe('UTC');
  });

  it.each(['Shell', 'S02', 'S04', 'S12', 'S14', 'S29'])('%s formats in Asia/Jakarta', (id) => {
    expect(timezoneFor({ id })).toBe('Asia/Jakarta');
  });

  it('freezes at the S18 instant unless a screen document names another', () => {
    expect(FROZEN_CLOCK).toBe('2026-10-23T09:12:31.000Z');
    expect(clockFor({ id: 'S03' })).toBe(FROZEN_CLOCK);
    expect(clockFor({ id: 'S20' })).toBe('2026-10-23T10:00:00.000Z');
  });

  it('builds a context of the §2 size, locale, motion and pixel ratio', () => {
    const [phone, wide] = VIEWPORTS;

    expect(contextOptions({ id: 'S03' })).toEqual({
      viewport: { width: 360, height: 800 },
      deviceScaleFactor: 1,
      locale: 'en-GB',
      timezoneId: 'Asia/Jakarta',
      reducedMotion: 'reduce',
    });
    expect(contextOptions({ id: 'S23' }, wide).viewport).toEqual({ width: 1920, height: 1080 });
    expect(contextOptions({ id: 'S23' }, phone).timezoneId).toBe('UTC');
  });

  it('lets the app, the local API, MinIO and Anvil through and nothing else', () => {
    expect(isAllowed('http://localhost:5173/app')).toBe(true);
    expect(isAllowed('http://127.0.0.1:4000/api/v1/healthz')).toBe(true);
    expect(isAllowed('http://[::1]:8545/')).toBe(true);
    expect(isAllowed('data:image/png;base64,AAAA')).toBe(true);
    expect(isAllowed('https://images.unsplash.com/photo-1')).toBe(false);
    expect(isAllowed('https://localhost.evil.example/')).toBe(false);
  });

  it('lets the Privy test harness through only when a spec names it', () => {
    expect(isAllowed('https://auth.privy.test/x')).toBe(false);
    expect(isAllowed('https://auth.privy.test/x', ['auth.privy.test'])).toBe(true);
  });

  it('a leading dot admits the host and its subdomains, and nothing that merely ends alike', () => {
    expect(isAllowed('https://auth.privy.io/x', ['.privy.io'])).toBe(true);
    expect(isAllowed('https://privy.io/x', ['.privy.io'])).toBe(true);
    expect(isAllowed('https://notprivy.io/x', ['.privy.io'])).toBe(false);
  });

  it('fails a spec that had a request aborted', () => {
    expect(() => expectNoBlocked({ blocked: [] })).not.toThrow();
    expect(() => expectNoBlocked({ blocked: ['https://cdn.example/a.js'] })).toThrow(
      /cdn\.example/,
    );
  });
});
