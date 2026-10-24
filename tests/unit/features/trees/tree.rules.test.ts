import { describe, expect, it } from 'vitest';
import type { TreeDetail } from '../../../../src/features/trees/tree.api';
import {
  amountText,
  artKind,
  flagFacts,
  growth,
  isLongProse,
  isLongRegion,
  isTreeId,
  label,
  locationText,
  payoutFacts,
  planterActions,
  shownMonth,
  thumbnailExpired,
  timelineNote,
  timelineTitle,
  windowText,
} from '../../../../src/features/trees/tree.rules';
import {
  DEAD_TREE,
  SARI_3001,
  SARI_3104,
  TREE_3001,
  TREE_3021,
  TREE_3091,
} from '../../../fidelity/fixtures/tree';

const typed = (value: unknown) => value as TreeDetail;
const NOW = Date.parse('2026-10-23T09:12:31.000Z');

describe('isTreeId', () => {
  it.each(['1', '3001', '9223372036854775807'])('accepts %s', (id) => {
    expect(isTreeId(id)).toBe(true);
  });

  it.each(['', '0', '01', '-1', '1.5', 'abc', '9223372036854775808', '12345678901234567890'])(
    'refuses %j',
    (id) => {
      expect(isTreeId(id)).toBe(false);
    },
  );
});

describe('locationText', () => {
  it('an exact fix has six decimals', () => {
    expect(locationText({ precision: 'exact', lat: -7.431205, lon: 109.247813 })).toBe(
      '-7.431205, 109.247813',
    );
  });

  it('a geohash cell centre has three decimals and says so', () => {
    expect(locationText({ precision: 'geohash', lat: -7.431564, lon: 109.24736 })).toBe(
      '-7.432, 109.247 · Approximate',
    );
  });
});

describe('labels', () => {
  it('names statuses and falls back to the raw word', () => {
    expect(label('alive')).toBe('Alive');
    expect(label('forfeited')).toBe('Forfeited');
    expect(label('mystery')).toBe('mystery');
  });

  it('draws the art that matches the status', () => {
    expect(artKind('alive')).toBe('growing');
    expect(artKind('removed')).toBe('removed');
  });

  it('formats a window and an amount; a missing amount is a dash', () => {
    const month12 = typed(TREE_3001).milestones[3]!;

    expect(windowText(month12)).toMatch(/^\d+ Apr 2027 – \d+ May 2027$/);
    expect(amountText('1575000')).toBe('1.575 USDC');
    expect(amountText(null)).toBe('—');
  });

  it('knows a long reason and a long region', () => {
    expect(isLongProse('x'.repeat(121))).toBe(true);
    expect(isLongProse('short')).toBe(false);
    expect(isLongRegion('y'.repeat(41))).toBe(true);
    expect(isLongRegion('Banyumas, Central Java')).toBe(false);
  });
});

describe('payoutFacts', () => {
  it('two paid milestones, the last payout and nothing forfeited', () => {
    expect(payoutFacts(typed(TREE_3001))).toEqual([
      ['Recorded payouts', '2 milestones · 2.1 USDC'],
      ['Planter / transaction', '0x4b9e…9d0e · 0xfc1aa443…'],
      ['Forfeited', 'None'],
    ]);
  });

  it('no payouts reads None; one payout is singular; removed forfeits', () => {
    const summary = TREE_3001.summary;
    const none = typed({ ...TREE_3001, payouts: [], summary: { ...summary, milestonesPaid: 0 } });
    const one = typed({
      ...TREE_3001,
      summary: { ...summary, milestonesPaid: 1, paidAmount: '1050000' },
    });

    expect(payoutFacts(none).map(([, value]) => value)).toEqual(['None', 'None', 'None']);
    expect(payoutFacts(one)[0]?.[1]).toBe('1 milestone · 1.05 USDC');
    expect(payoutFacts(typed(TREE_3021))[2]?.[1]).toBe('Unpaid milestones forfeited');
  });
});

describe('flagFacts', () => {
  it('shortens the id and says Not resolved without a note', () => {
    expect(flagFacts(typed(TREE_3091).flags[0]!)).toEqual([
      ['Flag', '#1f6c2a9e'],
      ['Status', 'Open'],
      ['Reason', 'Tree condition needs an independent check.'],
      ['Resolution', 'Not resolved'],
    ]);
  });
});

describe('lifecycle', () => {
  it('grows to month 36, full once completed', () => {
    expect(growth(typed(TREE_3001))).toBeCloseTo(6 / 36);
    expect(shownMonth(typed(TREE_3001))).toBe(6);

    const completed = typed({ ...TREE_3001, tree: { ...TREE_3001.tree, status: 'completed' } });

    expect(growth(completed)).toBe(1);
    expect(shownMonth(completed)).toBe(36);
  });
});

describe('timeline', () => {
  const [planted, checkIn] = typed(TREE_3001).timeline;

  it('titles and notes each kind', () => {
    expect(timelineTitle(planted!)).toBe('Planted');
    expect(timelineNote('planted')).toBe('Tree planted.');
    expect(timelineTitle(checkIn!)).toBe('Survival check · month 3');
    expect(timelineNote('check_in')).toBe('Milestone paid.');
    expect(timelineTitle({ ...checkIn!, evidence: null })).toEqual({ copyId: 'COPY-176' });
    expect(timelineTitle({ ...planted!, kind: 'replanted' })).toEqual({ copyId: 'COPY-159' });
    expect(timelineTitle({ ...planted!, kind: 'flag_resolved' })).toEqual({ copyId: 'COPY-160' });
    expect(timelineTitle({ ...planted!, kind: 'flagged' })).toBe('Flagged');
    expect(timelineNote('removed')).toBe('Status updated.');
  });

  it('a thumbnail URL is good for 15 minutes', () => {
    expect(thumbnailExpired(NOW - 899_000, NOW)).toBe(false);
    expect(thumbnailExpired(NOW - 901_000, NOW)).toBe(true);
  });
});

describe('planterActions', () => {
  const texts = (data: TreeDetail) => planterActions(data, NOW).map((action) => action.text);

  it('a signed-out viewer or a non-planter gets none', () => {
    expect(texts(typed(TREE_3001))).toEqual([]);
    expect(
      texts(typed({ ...SARI_3001, viewer: { ...SARI_3001.viewer, isPlanter: false } })),
    ).toEqual([]);
  });

  it('A-1/A-4: alive with an open milestone: record the check-in, report dead', () => {
    expect(texts(typed(SARI_3001))).toEqual(['Record check-in', 'Report dead']);
    expect(planterActions(typed(SARI_3001), NOW)[0]?.to).toBe(
      '/app/planter/record?tree=3001&kind=ALIVE',
    );
  });

  it('A-2: a live check-in links to its evidence instead of recording another', () => {
    const actions = planterActions(typed(SARI_3104), NOW);

    expect(actions.map((action) => action.text)).toEqual([
      'Month 6 check-in · needs review',
      'Report dead',
    ]);
    expect(actions[0]?.to).toBe('/app/evidence/9c2b7e4a-3d1f-4a8e-b6c5-0f9e8d7a6b53');
  });

  it('A-3: dead before the replant deadline offers the replant; after it, nothing', () => {
    const dead = typed({ ...DEAD_TREE, viewer: SARI_3001.viewer });

    expect(texts(dead)).toEqual(['Record replant']);
    expect(planterActions(dead, Date.parse('2026-11-05T00:00:00.000Z'))).toEqual([]);
  });

  it('A-4: no death report while one is already live', () => {
    const live = {
      ...SARI_3001.viewer,
      liveSubmissions: [{ id: 'a', kind: 'DEAD', month: 6, status: 'uploaded' }],
    };

    expect(texts(typed({ ...SARI_3001, viewer: live }))).toEqual(['Record check-in']);
  });

  it('a flagged tree offers no capture', () => {
    expect(texts(typed({ ...TREE_3091, viewer: SARI_3001.viewer }))).toEqual([]);
  });
});
