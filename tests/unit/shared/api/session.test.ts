import { beforeEach, describe, expect, it } from 'vitest';
import { forgetStoredSession } from '../../../../src/shared/api/session';

describe('forgetStoredSession', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('removes what Privy kept and nothing else', () => {
    localStorage.setItem('privy:token', 'a');
    localStorage.setItem('privy:refresh_token', 'b');
    localStorage.setItem('privy-something', 'c');
    sessionStorage.setItem('privy:state', 'd');
    localStorage.setItem('treecord:draft:1', 'keep');

    forgetStoredSession();

    expect(localStorage).toHaveLength(1);
    expect(localStorage.getItem('treecord:draft:1')).toBe('keep');
    expect(sessionStorage).toHaveLength(0);
  });

  it('expires the privy-token cookie', () => {
    document.cookie = 'privy-token=abc; path=/';
    expect(document.cookie).toContain('privy-token=abc');

    forgetStoredSession();

    expect(document.cookie).not.toContain('privy-token');
  });

  it('is fine when there is nothing to forget', () => {
    expect(() => forgetStoredSession()).not.toThrow();
  });
});
