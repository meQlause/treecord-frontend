// S19's words (s19-record.md §3, §6, §7). Registry and lorem ids are placeholders until the owner approves them.
import { UPLOAD_WINDOW_HOURS, MAX_GPS_ACCURACY_M } from '../evidence/evidence.config';
import type { CaptureKind } from '../evidence/evidence.rules';

export const RECORD_BACK_SLOTS = 'Slots';

export const RECORD_LINE_EM = 'evidence.';

export const RECORD_SUBTITLE = (title: string): string =>
  `${title} · camera and GPS on this device, sealed when you stop.`;

export const eyebrowOf = (kind: CaptureKind, month: number | null, id: string): string =>
  ({
    PLANTED: `PLANTING · SLOT #${id}`,
    ALIVE: `CHECK-IN · MONTH ${month ?? 0} · TREE #${id}`,
    DEAD: `DEAD TREE REPORT · TREE #${id}`,
    REPLANTED: `REPLANT · TREE #${id}`,
  })[kind];

const subjectOf = (kind: CaptureKind): string =>
  kind === 'PLANTED' ? 'seedling you just planted' : 'tree';

export const idleLead = (region: boolean, radiusM: number): string =>
  `${
    region
      ? `Your position must fall inside the ${radiusM.toLocaleString('en-GB')} m campaign region.`
      : `Your position must be within ${radiusM} m of where this tree was planted.`
  } GPS and time lock the moment you start recording. Keep tree tag `;

export const IDLE_PROMPT = (kind: CaptureKind): string =>
  `Point the camera at the ${subjectOf(kind)}. Move slowly around it for 5–⁠10 seconds.`;

export const OPEN_CAMERA = 'Open camera & GPS';

export const STARTING = 'Starting camera and GPS…';

export const CHIPS_IDLE = (kind: CaptureKind, radiusM: number): string[] => [
  '5–10 s',
  kind === 'PLANTED' ? 'inside the region' : `≤ ${radiusM} m of the spot`,
  `±${MAX_GPS_ACCURACY_M} m GPS`,
];

export const WAITING_GPS = 'Waiting for GPS…';

export const COARSE_CALLOUT = `Accuracy is above ${MAX_GPS_ACCURACY_M} m. You can record, but the server will reject it as gps_inaccurate. Step outside and wait for the number to drop.`;

export const NO_QR_NOTE =
  'This browser can’t read QR codes live; the server reads the tag from the video.';

export const START_RECORDING = 'Start recording';

export const STOP_RECORDING = 'Stop recording';

export const stopWait = (left: number): string => `Stop · minimum 5 s (${left.toFixed(0)})`;

export const recordingLead = (kind: CaptureKind): string =>
  `GPS and time are locked at the start. Keep the ${kind === 'PLANTED' ? 'seedling' : 'tree'} in frame.`;

export const SEALING = 'Hashing the original video and signing…';

export const SEALED = 'Sealed on this device';

export const UPLOAD_NOW = 'Upload now';

export const SAVE_OFFLINE = 'Save offline';

export const RETAKE = 'Retake';

export const PAYLOAD_SUMMARY = 'Signed payload';

export const CAPTURE_PANEL = 'Capture';

export const CAPTURE_NOTE = 'Camera only; the video stays here until uploaded.';

// ---- alerts ----
export const NO_SIGNING_KEY = 'This browser has no signing key. Register this device first.';

export const KEY_GONE = 'Signing key missing. Register this device again.';

export const CAMERA_DENIED =
  'Camera permission denied. Allow the camera for this site and try again.';

export const NO_CAMERA = 'No camera available on this device.';

export const NO_GPS = 'This browser has no GPS access.';

export const LOCATION_DENIED =
  'Location permission denied. Allow location for this site; evidence cannot be recorded without GPS.';

export const GPS_UNAVAILABLE = 'GPS position unavailable. Move to open sky and wait.';

/** COPY-202, 205, 206 and the registry's COPY-001/005/019/204: lorem until approved. */
export const COPY_KEY_UNREGISTERED = 'COPY-202';

export const COPY_TOO_LARGE = 'COPY-205';

export const COPY_CANNOT_RECORD = 'COPY-206';

export const COPY_UPLOAD_FAILED = 'COPY-204';

export const COPY_VIDEO_NOT_UPLOADED = 'COPY-019';

export const COPY_PAYLOAD_MISMATCH = 'COPY-005';

export const COPY_VALIDATION = 'COPY-001';

export const BUSY_LABEL = 'Lorem ipsum';

// ---- blocked and sent ----
export const BLOCKED_TITLE = 'Capture target unavailable';

export const BLOCKED_BODY = 'Open capture from an eligible tree or owned slot.';

export const MY_TREES = 'My trees';

export const OPEN_HELD = 'Open that submission';

const HELD_STATUS: Readonly<Record<string, string>> = {
  needs_review: 'in review',
  checking: 'being checked',
  scored: 'scored',
  attested: 'attested',
  onchain: 'on-chain',
};

const COUNTS: Readonly<Record<CaptureKind, (month: number | null) => string>> = {
  ALIVE: (month) => `month ${month ?? 0} check-in`,
  PLANTED: () => 'planting',
  DEAD: () => 'report',
  REPLANTED: () => 'report',
};

export const heldBody = (
  held: { id: string; status: string },
  kind: CaptureKind,
  month: number | null,
): string =>
  `Submission ${held.id} is ${HELD_STATUS[held.status] ?? held.status}; a ${COUNTS[kind](month)} counts once.`;

export const PRECHECKS_PASSED = 'Prechecks passed. Waiting for scoring.';

export const PRECHECKS_REJECTED = 'Rejected by the prechecks. See why.';

export const savedOffline = `Saved on this device. Upload within ${UPLOAD_WINDOW_HOURS} hours.`;

export const REVIEW_LABELS = {
  duration: 'Duration',
  hash: 'Video SHA-256',
  gps: 'GPS at capture',
  captured: 'Captured',
  tag: 'Tree tag',
  signature: 'Signature',
} as const;
