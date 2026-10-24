import { describe, expect, it } from 'vitest';
import { SIDEBAR_ITEMS, activeItem } from '../../../../src/app/shell/sidebar-items';

describe('SIDEBAR_ITEMS', () => {
  it('lists each role items in the order of shell.md §4 (no "This device", no "Jobs")', () => {
    const labels = (role: keyof typeof SIDEBAR_ITEMS) =>
      SIDEBAR_ITEMS[role].map((item) => item.label);

    expect(labels('donor')).toEqual(['Home', 'Campaigns', 'Carbon credits', 'My carbon']);
    expect(labels('planter')).toEqual(['My trees', 'Slots', 'Campaigns', 'Challenges', 'Uploads']);
    expect(labels('auditor')).toEqual(['Audit']);
    expect(labels('operator')).toEqual(['Campaigns']);
  });
});

describe('activeItem', () => {
  it.each([
    ['donor', '/app/donor', '/app/donor'],
    ['donor', '/campaigns', '/campaigns'],
    ['donor', '/campaigns/0x03/report', '/campaigns'],
    ['donor', '/app/campaigns/new', '/campaigns'],
    ['donor', '/carbon', '/carbon'],
    ['donor', '/carbon/12', '/carbon'],
    ['donor', '/carbon/retirements/9', '/app/carbon'],
    ['donor', '/app/carbon', '/app/carbon'],
    ['planter', '/trees/3001', '/app/planter/trees'],
    ['planter', '/app/planter/record', '/app/planter/trees'],
    ['planter', '/app/evidence/5', '/app/planter/uploads'],
    ['planter', '/app/planter/uploads', '/app/planter/uploads'],
    ['operator', '/app/operator/submissions/4', '/campaigns'],
    ['auditor', '/audit/7/reproduce', '/app/audit'],
    ['auditor', '/app/audit/7/report', '/app/audit'],
  ] as const)('%s on %s -> %s', (role, pathname, expected) => {
    expect(activeItem(pathname, role)).toBe(expected);
  });

  it.each([
    ['auditor', '/trees/3001'],
    ['donor', '/app/profile'],
    ['operator', '/carbon'],
  ] as const)('%s on %s: no item (the role has none for that page)', (role, pathname) => {
    expect(activeItem(pathname, role)).toBeUndefined();
  });
});
