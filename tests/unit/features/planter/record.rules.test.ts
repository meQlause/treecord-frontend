// s19-record.md §3: what the URL asks for, and how a blocked target reads.
import { describe, expect, it } from 'vitest';
import type { CaptureTarget } from '../../../../src/features/planter/record.api';
import { blockedOf, parseTarget, stepOf } from '../../../../src/features/planter/record.rules';

const search = (query: string) => parseTarget(new URLSearchParams(query));

describe('parseTarget', () => {
  it('reads a tree kind and a planting', () => {
    expect(search('tree=3001&kind=ALIVE')).toEqual({ kind: 'ALIVE', treeId: '3001' });
    expect(search('campaign=0x03&slot=41&kind=PLANTED')).toEqual({
      kind: 'PLANTED',
      campaign: '0x03',
      slotId: '41',
    });
  });

  it('refuses a missing or unknown kind, a half planting, a tree kind without its tree, and both targets', () => {
    for (const bad of [
      'tree=3001',
      'tree=3001&kind=SOLD',
      'slot=41&kind=PLANTED',
      'campaign=0x03&kind=PLANTED',
      'kind=DEAD',
      'tree=3001&slot=41&kind=ALIVE',
      'tree=3001&campaign=0x03&slot=41&kind=PLANTED',
    ]) {
      expect(search(bad), bad).toBeNull();
    }
  });
});

const BLOCKED = {
  kind: 'ALIVE',
  month: 6,
  allowed: false,
  reasons: ['milestone_already_done', 'tag_missing'],
  held: null,
} as CaptureTarget;

describe('blockedOf', () => {
  it('titles with the first reason and joins the others', () => {
    expect(blockedOf(BLOCKED)).toMatchObject({
      title: 'This milestone already has a check-in',
      body: 'No tree tag has been issued for this target',
      link: 'My trees',
    });
  });

  it('falls back to the generic body for one reason, and to the held submission when there is one', () => {
    expect(blockedOf({ ...BLOCKED, reasons: ['tag_missing'] }).body).toBe(
      'Open capture from an eligible tree or owned slot.',
    );
    expect(blockedOf({ ...BLOCKED, held: { id: 'abc', status: 'needs_review' } })).toMatchObject({
      body: 'Submission abc is in review; a month 6 check-in counts once.',
      to: '/app/evidence/abc',
      link: 'Open that submission',
    });
  });
});

describe('stepOf', () => {
  it('is on the track step of the phase', () => {
    expect(['idle', 'live', 'recording', 'review'].map((phase) => stepOf(phase as never))).toEqual([
      0, 1, 2, 3,
    ]);
  });
});
