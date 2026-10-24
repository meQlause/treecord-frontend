// The limits S19 and S20 show and enforce on the phone (s19-record.md §4). Each mirrors the backend's configuration; the
// server's own checks (evidence-prechecks.md §2) stay the source of truth.
export const APP_MIN_SEC = 5;

export const APP_MAX_SEC = 10;

export const MAX_GPS_ACCURACY_M = 30;

export const MAX_UPLOAD_BYTES = 26_214_400;

const MS_PER_HOUR = 3_600_000;

const WINDOW_HOURS = 72;

const UPLOAD_WINDOW_MS = WINDOW_HOURS * MS_PER_HOUR;

export const UPLOAD_WINDOW_HOURS = UPLOAD_WINDOW_MS / MS_PER_HOUR;

/** The recorder's preference, best first. */
export const RECORDER_TYPES = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'] as const;

export const TIMESLICE_MS = 250;

export const TICK_MS = 100;

export const QR_POLL_MS = 500;

export const GPS_TIMEOUT_MS = 30_000;
