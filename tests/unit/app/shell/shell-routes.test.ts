import { describe, expect, it } from 'vitest';
import {
  appClassName,
  isCarbonPath,
  isWorkspacePath,
} from '../../../../src/app/shell/shell-routes';

describe('isCarbonPath', () => {
  it.each(['/carbon', '/carbon/12', '/carbon/retirements/9', '/app/carbon'])('%s', (path) => {
    expect(isCarbonPath(path)).toBe(true);
  });

  it.each(['/campaigns', '/carbonara', '/app/donor'])('not %s', (path) => {
    expect(isCarbonPath(path)).toBe(false);
  });
});

describe('isWorkspacePath', () => {
  it.each(['/sign-in', '/trees/3001', '/audit/7/reproduce', '/app', '/app/profile'])(
    '%s',
    (path) => {
      expect(isWorkspacePath(path)).toBe(true);
    },
  );

  it.each(['/campaigns', '/campaigns/0x1/report', '/carbon', '/app/carbon'])('not %s', (path) => {
    expect(isWorkspacePath(path)).toBe(false);
  });
});

describe('appClassName', () => {
  it('is plain "app" signed out and playing on a campaigns page', () => {
    expect(appClassName({ signedIn: false, pathname: '/campaigns', still: false })).toBe('app');
  });

  it('adds signed-in, the page skin and motion-paused', () => {
    expect(appClassName({ signedIn: true, pathname: '/app/donor', still: true })).toBe(
      'app signed-in app--donor motion-paused',
    );
    expect(appClassName({ signedIn: true, pathname: '/app/carbon', still: false })).toBe(
      'app signed-in app--carbon',
    );
  });
});
