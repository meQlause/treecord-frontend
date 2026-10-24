// s20-uploads.md §2.3: the picture's step, the reason line, the filter and the counts.
import { describe, expect, it } from 'vitest';
import type { UploadItem } from '../../../../src/features/planter/planter.api';
import {
  parseFilter,
  rejectedLine,
  shownTotal,
  stepOf,
  titleOf,
} from '../../../../src/features/planter/uploads.rules';

const item = (changes: Partial<UploadItem>): UploadItem =>
  ({
    status: 'checking',
    pipeline: { step: 3, failedAt: null },
    rejection: null,
    treeId: '3001',
    slotId: null,
    ...changes,
  }) as UploadItem;

describe('stepOf', () => {
  it('is -1 queued, 4 on-chain, 2 in review, the cross for a turned-back one, else step - 2', () => {
    expect(stepOf(null)).toBe(-1);
    expect(stepOf(item({ status: 'onchain' }))).toBe(4);
    expect(stepOf(item({ status: 'needs_review' }))).toBe(2);
    expect(stepOf(item({ status: 'rejected', pipeline: { step: 2, failedAt: 'scored' } }))).toBe(1);
    expect(stepOf(item({ status: 'failed', pipeline: { step: 2, failedAt: null } }))).toBe(0);
    expect(stepOf(item({}))).toBe(1);
  });
});

describe('rejectedLine', () => {
  it('joins precheck reasons with their value, quotes the operator, lists policy reasons, and has a fallback', () => {
    const reasons = [
      { reason: 'gps_inaccurate', value: '41.0 m' },
      { reason: 'video_too_short', value: '3.1 s' },
    ];

    expect(rejectedLine(item({ rejection: { stage: 'precheck', reasons, note: null } }))).toBe(
      'GPS accuracy too low (41.0 m) · Video too short (3.1 s)',
    );
    expect(
      rejectedLine(item({ rejection: { stage: 'operator', reasons: [], note: 'Blurry' } })),
    ).toBe('Operator: Blurry');
    expect(
      rejectedLine(
        item({
          rejection: {
            stage: 'policy',
            reasons: [{ reason: 'liveness_low', value: null }],
            note: null,
          },
        }),
      ),
    ).toBe('Not a live scene');
    expect(rejectedLine(item({}))).toBe('Turned back by the server');
    expect(rejectedLine(item({ status: 'failed' }))).toBeNull();
  });
});

describe('filter and counts', () => {
  it('reads the filter param, titles by tree or slot, and totals per filter', () => {
    expect(parseFilter('waiting')).toBe('Waiting');
    expect(parseFilter('nonsense')).toBe('All');
    expect(titleOf({ treeId: null, slotId: '41' })).toBe('Slot #41');
    expect(titleOf({ treeId: '3001', slotId: null })).toBe('Tree #3001');

    const summary = { all: 3, sent: 2, rejected: 1 };

    expect(shownTotal('All', 1, summary)).toBe(4);
    expect(shownTotal('Waiting', 1, undefined)).toBe(1);
    expect(shownTotal('Sent', 1, summary)).toBe(2);
    expect(shownTotal('Rejected', 1, undefined)).toBeNull();
  });
});
