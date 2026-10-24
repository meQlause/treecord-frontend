import { describe, expect, it } from 'vitest';
import {
  isJobId,
  isSettled,
  kindLabel,
  lifecycle,
  pollDelay,
  railNote,
  statusMeaning,
} from '../../../../src/features/accounts/accounts.rules';

describe('isJobId', () => {
  it('accepts a uuid and refuses anything else, so a bad id sends no request', () => {
    expect(isJobId('3f2a9c1e-7b4d-4e8a-9c21-5d6f0a8b3e17')).toBe(true);
    expect(isJobId('3F2A9C1E-7B4D-4E8A-9C21-5D6F0A8B3E17')).toBe(true);
    expect(isJobId('demo-claim')).toBe(false);
    expect(isJobId('')).toBe(false);
  });
});

describe('kindLabel', () => {
  it('labels the kinds the screen knows and shows the identifier of the others', () => {
    expect(kindLabel('claim')).toBe('Claim slots');
    expect(kindLabel('score')).toBe('Score evidence');
    expect(kindLabel('anchor_assign')).toBe('anchor_assign');
  });
});

describe('lifecycle', () => {
  it('marks the steps behind as done, the current one as now, and fills the track to it', () => {
    expect(lifecycle('pending')).toEqual({ states: ['now', '', '', ''], fill: 0 });
    expect(lifecycle('sent')).toEqual({ states: ['done', 'done', 'now', ''], fill: 2 / 3 });
  });

  it('a confirmed job has every step done and the track full', () => {
    expect(lifecycle('confirmed')).toEqual({ states: ['done', 'done', 'done', 'done'], fill: 1 });
  });

  it('a failed job has no step current and an empty track', () => {
    expect(lifecycle('failed')).toEqual({ states: ['', '', '', ''], fill: 0 });
  });
});

describe('railNote and statusMeaning', () => {
  it('counts the step out of four, or says the job failed', () => {
    expect(railNote('pending')).toBe('Step 1 of 4');
    expect(railNote('sent')).toBe('Step 3 of 4');
    expect(railNote('confirmed')).toBe('Step 4 of 4');
    expect(railNote('failed')).toBe('Failed · retry below');
  });

  it('says what each status means, and that a scored job is not a verdict on the evidence', () => {
    expect(statusMeaning('claim', 'processing')).toBe(
      'Awaiting processing; no confirmed result yet.',
    );
    expect(statusMeaning('claim', 'sent')).toBe('Broadcast. The receipt is not final yet.');
    expect(statusMeaning('claim', 'confirmed')).toBe(
      'Confirmed. The result is in your workspace now.',
    );
    expect(statusMeaning('score', 'confirmed')).toBe(
      'Scoring finished; this does not mean evidence passed.',
    );
    expect(statusMeaning('claim', 'failed')).toBe(
      'The job failed. Check the originating action, then retry.',
    );
  });
});

describe('polling', () => {
  it('stops at the two ends', () => {
    expect(isSettled('confirmed')).toBe(true);
    expect(isSettled('failed')).toBe(true);
    expect(isSettled('sent')).toBe(false);
  });

  it('waits 2 s, then 1.5 times longer after each poll that found the same job, up to 5 s', () => {
    const waits = [2000];

    for (let poll = 0; poll < 4; poll += 1) {
      waits.push(pollDelay(waits.at(-1) ?? 0, false));
    }

    expect(waits).toEqual([2000, 3000, 4500, 5000, 5000]);
  });

  it('starts over at 2 s when the job changed', () => {
    expect(pollDelay(5000, true)).toBe(2000);
  });
});
