// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { createMemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { titleFor, watchTitle } from '../../../src/app/page-title';

describe('document title (FR-016)', () => {
  it.each([
    ['/sign-in', 'Sign in · Treecord'],
    ['/campaigns', 'Campaigns · Treecord'],
    ['/campaigns/0x0000000000000000000000000000000000000003/report', 'Impact report · Treecord'],
    ['/carbon/retirements/demo-001', 'Retirement certificate · Treecord'],
    ['/app/profile', 'Profile · Treecord'],
    ['/app/jobs/9', 'Transaction / job · Treecord'],
    ['/app/planter/trees', 'My trees · Treecord'],
    ['/app/operator/trees/3091/flags/1', 'Resolve flag · Treecord'],
    ['/app/nope', 'Not found · Treecord'],
    ['/nowhere', 'Not found · Treecord'],
  ])('%s → %s', (path, title) => {
    expect(titleFor(path)).toBe(title);
  });

  it('SH-AC18 / SH-AC24: the title follows the router', async () => {
    const router = createMemoryRouter([{ path: '/app/profile' }, { path: '*' }], {
      initialEntries: ['/app/profile'],
    });
    const stop = watchTitle(router);

    expect(document.title).toBe('Profile · Treecord');

    await router.navigate('/app/nope');

    expect(document.title).toBe('Not found · Treecord');

    stop();
    await router.navigate('/app/profile');

    expect(document.title).toBe('Not found · Treecord');
  });
});
