import { describe, expect, it } from 'vitest';
import type { PlanterTree } from '../../../../src/features/planter/planter.api';
import {
  dotsOf,
  filterOf,
  fundingRow,
  metaLine,
  parseStatus,
  percentPaid,
  primaryAction,
  reportDeadLink,
  statusOfFilter,
} from '../../../../src/features/planter/planter.rules';

const WINDOWS = [
  ['paid', '2026-04-18T05:00:00.000Z', '2026-05-18T05:00:00.000Z', 0],
  ['paid', '2026-07-17T05:00:00.000Z', '2026-08-16T05:00:00.000Z', 3],
  ['open', '2026-10-15T05:00:00.000Z', '2026-11-14T05:00:00.000Z', 6],
  ['upcoming', '2027-04-13T05:00:00.000Z', '2027-05-13T05:00:00.000Z', 12],
] as const;

const none = { allowed: false, reasons: [], held: null };

const tree = (changes: Partial<PlanterTree> = {}): PlanterTree =>
  ({
    treeId: '3001',
    status: 'alive',
    replantDeadline: null,
    currentMilestone: 2,
    milestones: WINDOWS.map(([state, opensAt, closesAt, month], milestone) => ({
      milestone,
      month,
      amount: '1050000',
      state,
      opensAt,
      closesAt,
    })),
    capture: {
      ALIVE: { ...none, allowed: true },
      DEAD: { ...none, allowed: true },
      REPLANTED: none,
    },
    ...changes,
  }) as unknown as PlanterTree;

describe('the status filter', () => {
  it('drops an unknown ?status= and maps the buttons both ways', () => {
    expect(parseStatus('alive')).toBe('alive');
    expect(parseStatus('paused')).toBeUndefined();
    expect(filterOf(undefined)).toBe('All');
    expect(filterOf('flagged')).toBe('Flagged');
    expect(statusOfFilter('Dead')).toBe('dead');
    expect(statusOfFilter('All')).toBeUndefined();
  });
});

describe('the milestone dots and the progress', () => {
  it('reads a missed window as forfeited, and the share paid as a count of the windows', () => {
    const missed = tree({
      milestones: tree().milestones.map((milestone, index) =>
        index === 2 ? { ...milestone, state: 'missed' as const } : milestone,
      ),
    });

    expect(dotsOf(missed).map(({ status }) => status)).toEqual([
      'Paid',
      'Paid',
      'Forfeited',
      'Upcoming',
    ]);
    expect(percentPaid(tree())).toBe(50);
  });
});

describe('fundingRow', () => {
  it('names the next window and its payout, to two decimals at most', () => {
    expect(fundingRow(tree())).toEqual({ title: 'Month 6', caption: '1.05 USDC next' });
  });

  it('says a flagged tree is paused at its current month', () => {
    expect(fundingRow(tree({ status: 'flagged' }))).toEqual({
      title: 'Paused at month 6',
      caption: 'until the flag is resolved',
    });
  });

  it('says a tree with nothing left is settled, and whether every milestone was paid', () => {
    const settled = tree({
      milestones: tree().milestones.map((milestone) => ({ ...milestone, state: 'paid' as const })),
    });

    expect(fundingRow({ ...settled, status: 'completed' })).toEqual({
      title: 'All settled',
      caption: 'every milestone paid',
    });
    expect(fundingRow({ ...settled, status: 'removed' }).caption).toBe('no further payouts');
  });
});

describe('metaLine', () => {
  it('says a check-in was submitted from this phone only when the device ids match', () => {
    const held = tree({
      capture: {
        ...tree().capture,
        ALIVE: {
          allowed: false,
          reasons: [],
          held: { id: 'e', status: 'needs_review', month: 6, deviceId: 'phone' },
        },
      },
    });

    expect(metaLine(held, 'phone')).toBe('Submitted from this phone · needs review');
    expect(metaLine(held, 'other')).toBe('Submitted · needs review');
    expect(metaLine(held, null)).toBe('Submitted · needs review');
  });

  it('follows the order: paused, replant deadline, open window, next window, settled', () => {
    expect(metaLine(tree({ status: 'flagged' }), null)).toBe('Payouts and clock paused');
    expect(
      metaLine(tree({ status: 'dead', replantDeadline: '2026-11-04T05:00:00.000Z' }), null),
    ).toBe('Replant by 4 Nov 2026');
    expect(metaLine(tree({ status: 'dead' }), null)).toBe('Replant by —');
    expect(metaLine(tree(), null)).toBe('Window open until 14 Nov 2026');
    expect(metaLine(tree({ currentMilestone: 3 }), null)).toBe('Next window 13 Apr 2027');
    expect(metaLine(tree({ status: 'removed', currentMilestone: null }), null)).toBe('Settled');
  });
});

describe('primaryAction and reportDeadLink', () => {
  it('records a check-in when the server allows it, with "Report dead" beside it', () => {
    expect(primaryAction(tree())).toEqual({
      label: 'Record check-in',
      to: '/app/planter/record?tree=3001&kind=ALIVE',
      icon: 'check',
    });
    expect(reportDeadLink(tree())).toBe('/app/planter/record?tree=3001&kind=DEAD');
  });

  it('opens the held evidence, then offers a replant, and otherwise only the tree', () => {
    const held = {
      allowed: false,
      reasons: [],
      held: { id: 'e1', status: 'needs_review', month: 6, deviceId: null },
    };

    expect(primaryAction(tree({ capture: { ...tree().capture, ALIVE: held } })).label).toBe(
      'Month 6 check-in in review',
    );
    expect(
      primaryAction(
        tree({
          status: 'dead',
          capture: { ...tree().capture, ALIVE: none, REPLANTED: { ...none, allowed: true } },
        }),
      ).label,
    ).toBe('Record replant');
    expect(
      primaryAction(tree({ status: 'flagged', capture: { ...tree().capture, ALIVE: none } })),
    ).toEqual({
      label: 'View tree',
      to: '/trees/3001',
      icon: 'arrow',
    });
  });

  it('never reports a flagged tree dead', () => {
    expect(reportDeadLink(tree({ status: 'flagged' }))).toBeNull();
  });
});
