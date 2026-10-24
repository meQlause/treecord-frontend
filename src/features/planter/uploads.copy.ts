// S20's words (s20-uploads.md §2.3, §3, §6). Registry and lorem ids stay placeholders until the owner approves them.
import { UPLOAD_WINDOW_HOURS } from '../evidence/evidence.config';
import type { CaptureKind } from '../evidence/evidence.rules';

export const UPLOADS_EYEBROW = 'PLANTER WORKSPACE';

export const UPLOADS_LINE = 'Recorded here,';

export const UPLOADS_EM = 'sent when ready.';

export const UPLOADS_COORD = '09 / UPLOADS';

export const UPLOADS_CATALOG = 'On this device';

export const UPLOADS_KICKER = 'Nothing leaves before you send it.';

export const UPLOAD_FILTERS = ['All', 'Waiting', 'Sent', 'Rejected'] as const;

export const UPLOAD_FILTERS_LABEL = 'Upload status';

export const ONLINE = 'Online';

export const OFFLINE_WORD = 'Offline';

export const STATUS_LINE = `upload within ${UPLOAD_WINDOW_HOURS} hours of recording; the signature already locks the GPS and time.`;

export const NO_RECORDINGS = 'No recordings yet';

export const GO_TO_TREES = 'Go to my trees';

/** COPY-404: lorem until the owner approves the title of a filter that matches nothing. */
export const NO_MATCH_COPY = 'COPY-404';

/** COPY-421: the badge of a local row past the upload window. */
export const EXPIRED_COPY = 'COPY-421';

export const VIEW_SUBMISSION = 'View submission';

export const FACT_RECORDED = 'Recorded';

export const FACT_VIDEO = 'Video';

export const FACT_GPS = 'GPS';

export const FACT_UPLOAD_BY = 'Upload by';

export const KEPT_ON_SERVER = 'Kept on the server';

export const DISCARD = 'Discard';

export const KEEP_IT = 'Keep it';

export const DISCARD_QUESTION =
  'Discard this recording? The video is deleted from this device and nothing is sent.';

export const WAITING = 'Waiting';

export const TURNED_BACK = 'Turned back by the server';

export const UPLOAD_NOW = 'Upload now';

export const BADGE_LABEL: Readonly<Record<string, string>> = {
  uploaded: 'Uploaded',
  checking: 'Checking',
  scored: 'Scored',
  attested: 'Attested',
  onchain: 'On-chain',
  needs_review: 'Needs review',
  rejected: 'Rejected',
  failed: 'Processing failed',
};

export const BADGE_CLASS: Readonly<Record<string, string>> = {
  onchain: 'active',
  needs_review: 'refunding',
  rejected: 'refunding',
  failed: 'refunding',
};

const KIND_LABEL: Readonly<Record<CaptureKind, string>> = {
  ALIVE: 'Check-in',
  PLANTED: 'Planting',
  DEAD: 'Dead report',
  REPLANTED: 'Replant',
};

/** "Check-in · month 6", "Planting", "Dead report", "Replant". */
export const kindLabel = (kind: CaptureKind, month: number | null): string =>
  kind === 'ALIVE' && month !== null ? `${KIND_LABEL.ALIVE} · month ${month}` : KIND_LABEL[kind];

export const uploadsMeta = (shown: number, all: number | null): string => {
  const ofAll = all !== null && shown < all ? ` of ${all}` : '';

  return `${shown} recordings${ofAll}`;
};

export const waitingNote = (waiting: number): string =>
  waiting > 0 ? `${waiting} waiting to upload` : 'All sent';

export const operatorNote = (note: string): string => `Operator: ${note}`;

/** The labels under the card picture's four steps. */
export const STEP_LABELS = (review: boolean): readonly string[] => [
  'Checks',
  'Score',
  review ? 'Review' : 'Attest',
  'On-chain',
];
