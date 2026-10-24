// FR-241: every date and time in the viewer's own zone (en-GB), the zone named on any time of day; UTC only where a
// requirement names it: S06 "As of" (FR-064), S08 "Issued on" (FR-221), S09 "Retired at" (FR-236).
export type Instant = Date | string | number;

const LOCALE = 'en-GB';
const DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
const LONG_DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
const DATE_TIME: Intl.DateTimeFormatOptions = {
  ...DATE,
  hour: '2-digit',
  minute: '2-digit',
};

const render = (value: Instant, options: Intl.DateTimeFormatOptions, zone?: string): string =>
  new Intl.DateTimeFormat(
    LOCALE,
    zone === undefined ? options : { ...options, timeZone: zone },
  ).format(new Date(value));

/** "23 Oct 2026" in the viewer's zone (or `zone`, an IANA name, for a test or a fixed view). */
export const localDate = (value: Instant, zone?: string): string => render(value, DATE, zone);

/** "23 October 2026" in the viewer's zone: S09's certificate and status panel. */
export const localDateLong = (value: Instant, zone?: string): string =>
  render(value, LONG_DATE, zone);

/** "23 Oct 2026, 10:03 GMT+7" in the viewer's zone. */
export const localDateTime = (value: Instant, zone?: string): string =>
  render(value, { ...DATE_TIME, timeZoneName: 'short' }, zone);

/** "23 Oct 2026 UTC": S06 "As of", S08 "Issued on", S09 "Retired at". */
export const utcDate = (value: Instant): string => `${render(value, DATE, 'UTC')} UTC`;

/** "23 Oct 2026, 08:00 UTC": a UTC field that shows a time of day. */
export const utcDateTime = (value: Instant): string => `${render(value, DATE_TIME, 'UTC')} UTC`;

/** The viewer's IANA zone, e.g. "Asia/Jakarta", for "Your local time · {zone}" hints. */
export const localZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;
