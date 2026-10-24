// phases.md F0a: routes.tsx declares every docs/FE/fidelity.md §1 route, each lazy-loading its screen module.
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { matchRoutes, type RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from '../../../src/app/routes';
import type { RouteHandle } from '../../../src/app/route-handle';
import { MATRIX } from '../../fidelity/matrix';

const PATH = /\/[A-Za-z0-9:_/-]*/g;

/** The paths a matrix row names, with every `:param` filled in. */
const pathsOf = (route: string): string[] =>
  (route.replaceAll('`', '').match(PATH) ?? []).map((path) => path.replace(/:[A-Za-z]+/g, 'x1'));

const walk = (list: RouteObject[]): RouteObject[] =>
  list.flatMap((route) => [route, ...walk(route.children ?? [])]);

const rolesFor = (path: string): readonly string[] | undefined =>
  matchRoutes(routes, path)
    ?.map((match) => (match.route.handle as RouteHandle | undefined)?.roles)
    .find((roles) => roles !== undefined);

const matrixPaths = MATRIX.filter((row) => row.id !== 'Shell').flatMap((row) =>
  pathsOf(row.route).map((path) => [row.id, path] as const),
);

describe('routes', () => {
  it.each(matrixPaths)('%s: %s is declared', (_id, path) => {
    const leaf = matchRoutes(routes, path)?.at(-1)?.route;

    expect(leaf).toBeDefined();
    expect(leaf?.path).not.toBe('*');
  });

  it.each(['/', '/app'])('%s is an index route (the landing redirect, the role home)', (path) => {
    expect(matchRoutes(routes, path)?.at(-1)?.route.index).toBe(true);
  });

  it.each(['/nothing/here', '/app/nothing/here'])('%s falls to the catch-all', (path) => {
    expect(matchRoutes(routes, path)?.at(-1)?.route.path).toBe('*');
  });

  it('every route lazy-loads, and its module exports a Component', async () => {
    const lazies = walk(routes).filter((route) => route.lazy !== undefined);

    expect(lazies.length).toBeGreaterThan(matrixPaths.length);

    for (const route of lazies) {
      const load = route.lazy as () => Promise<{ Component: unknown }>;

      expect(typeof (await load()).Component).toBe('function');
    }
    // the guards and S02 load the Privy SDK, which takes a cold import several seconds
  }, 60_000);

  it('no route holds an element or component of its own: screens are always lazy', () => {
    walk(routes).forEach((route) => {
      expect(route.Component).toBeUndefined();
      expect(route.element).toBeUndefined();
    });
  });

  it.each([
    ['/app/planter/trees', ['planter']],
    ['/app/planter/record', ['planter']],
    ['/app/operator/campaigns/0xabc', ['operator']],
    ['/app/audit', ['auditor']],
    ['/app/audit/s1/trees/7', ['auditor']],
    ['/app/donor', ['donor', 'operator']],
    ['/app/campaigns/new', ['donor', 'operator']],
  ])('%s is gated to %j', (path, roles) => {
    expect(rolesFor(path)).toEqual(roles);
  });

  it.each(['/app/profile', '/app/jobs/9', '/app/evidence/9', '/app/carbon', '/campaigns'])(
    '%s has no role gate',
    (path) => {
      expect(rolesFor(path)).toBeUndefined();
    },
  );
});
