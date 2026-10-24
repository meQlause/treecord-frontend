// s21-evidence.md §2.3: the note, the verdict, the pipeline, the bands and the keyframe times the page shows.
import { describe, expect, it } from 'vitest';
import type { Evidence } from '../../../../src/features/planter/evidence.api';
import {
  bandOf,
  frameTime,
  noteOf,
  recordAgainOf,
  stepStates,
  verdictOf,
} from '../../../../src/features/planter/evidence.rules';

const evidence = (changes: Partial<Evidence>): Evidence =>
  ({
    id: 'e1',
    kind: 'ALIVE',
    status: 'checking',
    campaign: { address: '0x03' },
    slotId: null,
    treeId: '3001',
    durationSec: 7,
    payload: null,
    precheckResults: [],
    rejectReasons: [],
    ai: null,
    review: null,
    pipeline: { step: 2, failedAt: null },
    ...changes,
  }) as Evidence;

describe('noteOf', () => {
  it('names who turned a submission back: the operator, the policy, or the prechecks', () => {
    const reasons = ['gps_inaccurate', 'operator_rejected'];

    expect(
      noteOf(
        evidence({
          status: 'rejected',
          rejectReasons: reasons,
          review: { note: 'Blurry', decision: 'rejected' },
        }),
      ),
    ).toBe('Rejected: Blurry');
    expect(noteOf(evidence({ status: 'rejected', rejectReasons: reasons }))).toBe(
      'Rejected before scoring: GPS accuracy too low.',
    );
    expect(
      noteOf(
        evidence({
          status: 'rejected',
          rejectReasons: ['liveness_low'],
          ai: { modelVersion: 'm', scores: {} as never },
        }),
      ),
    ).toBe('Rejected by the policy: Not a live scene.');
  });
});

describe('verdictOf and stepStates', () => {
  it('counts passed prechecks, holds the share at 0 when turned back, and marks the failed step', () => {
    const pass = { check: 'device', ok: true, value: null, reason: null };
    const skip = { ...pass, check: 'tag', ok: null };
    const fail = { ...pass, check: 'gps_accuracy', ok: false, reason: 'gps_inaccurate' };

    expect(verdictOf(evidence({ precheckResults: [pass, skip, pass] }))).toMatchObject({
      caption: 'Prechecks passed',
      value: '2/2',
      share: 0.4,
    });
    expect(
      verdictOf(
        evidence({
          status: 'rejected',
          precheckResults: [pass, fail],
          pipeline: { step: 2, failedAt: 'prechecks' },
        }),
      ),
    ).toMatchObject({ caption: 'Status', value: 'Rejected', share: 0, shareNote: 'Rejected' });
    expect(
      stepStates(evidence({ status: 'rejected', pipeline: { step: 2, failedAt: 'prechecks' } })),
    ).toEqual(['done', 'bad', '', '', '']);
    expect(
      stepStates(evidence({ status: 'onchain', pipeline: { step: 5, failedAt: null } })),
    ).toEqual(['done', 'done', 'done', 'done', 'done']);
  });
});

describe('bands, times and links', () => {
  it('colours a score against its limits and spreads keyframe times over the recording', () => {
    const live = { label: 'Liveness', limits: { reject: 0.7, review: 0.8 }, up: true };
    const recapture = { label: 'Recapture', limits: { reject: 0.3, review: 0.2 }, up: false };

    expect(bandOf({ ...live, value: 0.9 })).toBe('ok');
    expect(bandOf({ ...live, value: 0.75 })).toBe('near');
    expect(bandOf({ ...live, value: 0.5 })).toBe('bad');
    expect(bandOf({ ...recapture, value: 0.25 })).toBe('near');
    expect(bandOf({ ...recapture, value: null })).toBe('near');
    expect([0, 1, 2].map((index) => frameTime(index, 3, 7))).toEqual(['0.0 s', '3.5 s', '7.0 s']);
    expect(frameTime(0, 1, 7)).toBe('0.0 s');
    expect(recordAgainOf(evidence({}))).toBe('/app/planter/record?tree=3001&kind=ALIVE');
    expect(recordAgainOf(evidence({ kind: 'PLANTED', treeId: null, slotId: '41' }))).toBe(
      '/app/planter/record?campaign=0x03&slot=41&kind=PLANTED',
    );
  });
});
