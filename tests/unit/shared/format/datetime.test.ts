import { describe, expect, it } from 'vitest';
import {
  localDate,
  localDateTime,
  localZone,
  utcDate,
  utcDateTime,
} from '../../../../src/shared/format/datetime';

const JOB_UPDATED = '2026-10-23T03:03:00Z';
const JAKARTA = 'Asia/Jakarta';

describe('localDateTime', () => {
  it("shows the time in the viewer's zone and names the zone (FR-241 acceptance 1)", () => {
    expect(localDateTime(JOB_UPDATED, JAKARTA)).toBe('23 Oct 2026, 10:03 GMT+7');
  });

  it('moves the day when the zone crosses midnight', () => {
    expect(localDateTime('2026-10-23T20:00:00Z', JAKARTA)).toBe('24 Oct 2026, 03:00 GMT+7');
    expect(localDateTime('2026-10-23T20:00:00Z', 'UTC')).toBe('23 Oct 2026, 20:00 UTC');
  });

  it('takes an ISO string, epoch milliseconds or a Date alike', () => {
    const instant = Date.parse(JOB_UPDATED);

    expect(localDateTime(instant, JAKARTA)).toBe(localDateTime(new Date(instant), JAKARTA));
    expect(localDateTime(JOB_UPDATED, JAKARTA)).toBe(localDateTime(instant, JAKARTA));
  });

  it('uses the zone of the machine when none is given', () => {
    expect(localDateTime(JOB_UPDATED)).toBe(
      new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(new Date(JOB_UPDATED)),
    );
  });
});

describe('localDate', () => {
  it('is date-only, in the same zone', () => {
    expect(localDate('2026-10-23T20:00:00Z', JAKARTA)).toBe('24 Oct 2026');
    expect(localDate('2026-10-23T20:00:00Z', 'UTC')).toBe('23 Oct 2026');
  });
});

describe('utcDate and utcDateTime', () => {
  it('stay in UTC with the word UTC, whatever the machine zone (FR-241 acceptance 2)', () => {
    expect(utcDate('2026-10-23T23:30:00Z')).toBe('23 Oct 2026 UTC');
    expect(utcDateTime('2026-10-23T08:00:00Z')).toBe('23 Oct 2026, 08:00 UTC');
  });
});

describe('localZone', () => {
  it('is an IANA name', () => {
    expect(localZone()).toMatch(/^[A-Za-z_]+(\/[A-Za-z_+\-0-9]+)*$/);
  });
});
