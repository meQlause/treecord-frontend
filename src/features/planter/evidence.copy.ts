// S21's words (s21-evidence.md §2.3, §3, §6). Registry and lorem ids stay placeholders until the owner approves them.
export const EVIDENCE_TITLE = 'Evidence,';

export const NOT_FOUND_TITLE = 'Evidence not found';

/** A word that is either text or a COPY id with no approved text yet. */
export type Words = string | { copyId: string };

export const TITLE_WORD: Readonly<Record<string, string>> = {
  rejected: 'turned back.',
  needs_review: 'in review.',
  onchain: 'on the chain.',
};

export const DEFAULT_TITLE_WORD = 'checked.';

export const STATUS_NOTE: Readonly<Record<string, Words>> = {
  queued: { copyId: 'COPY-207' },
  checking:
    'Prechecks passed. Waiting for AI scoring (liveness, recapture, tree presence, growth).',
  scored: 'Scored. The platform signs the attestation next.',
  needs_review: 'Borderline scores. An operator reviews it.',
  attested: 'Accepted and signed by the platform. Waiting to be recorded on-chain.',
  onchain: 'Recorded on-chain. The milestone counts.',
  failed: 'Processing failed',
};

const STATUS_LABEL: Readonly<Record<string, string>> = {
  needs_review: 'In review',
  failed: 'Processing failed',
};

export const capitalised = (status: string): string =>
  STATUS_LABEL[status] ?? `${status.charAt(0).toUpperCase()}${status.slice(1)}`;

export const PIPELINE_STEPS = ['Uploaded', 'Prechecks', 'Scored', 'Attested', 'On-chain'] as const;

export const PIPELINE_EYEBROW = 'FROM THIS PHONE TO THE CHAIN';

export const PIPELINE_TITLE = 'Pipeline';

export const PIPELINE_NOTE = 'Same rules as the backend precheck.';

export const VERDICT = 'Verdict';

export const VERDICT_NOTE = 'AI scoring and the on-chain attestation run on the server.';

export const PRECHECKS_PASSED = 'Prechecks passed';

export const STATUS_CAPTION = 'Status';

export const CHECKS_UNIT = 'checks';

export const OPERATOR_REVIEW = 'Operator review';

export const PRECHECKS_TITLE = 'Server prechecks';

export const CHECKING = 'Checking…';

export const NOT_CHECKED = 'not checked';

export const SIGNED_RECORD = 'Signed record';

export const PAYLOAD_SUMMARY = 'Signed payload · signature';

export const AI_TITLE = 'AI scores';

export const SCORING = 'Scoring';

export const SCORING_BODY = 'Liveness, recapture, tree presence and growth are being scored.';

export const NOT_SCORED = 'Not scored';

export const TURNED_BACK_BEFORE_MODEL = 'Turned back by the prechecks before any model ran.';

export const SCORING_LATER = 'Scoring runs once the upload passes its prechecks.';

export const POLICY_SCORE = 'Policy score';

export const POLICY_OUT_OF = 'of 10,000';

export const PASS_NOTE =
  'Every score cleared its pass line, so the platform signs the attestation.';

export const SUBMISSION_TITLE = 'Submission';

export const NO_NOTE = 'None';

export const KEPT_ON_SERVER = 'Video kept on the server';

export const NO_VIDEO = 'Video not on this device';

export const VIEW_TREE = 'View tree';

export const REVIEW_SUBMISSION = 'Review submission';

export const RECORD_AGAIN = 'Record again';

export const ALL_UPLOADS = 'All uploads';

const THREE = 3;

export const framesAria = (seconds: number, frames: number): string =>
  `${seconds} second recording, ${frames === THREE ? 'three' : frames} keyframes; the video is kept on the server`;

export const gaugeLimit = (up: boolean, limit: number): string =>
  `pass ${up ? '≥' : '≤'} ${limit.toFixed(2)}`;

export const BORDERLINE = ' · borderline';

export const FAILS = ' · fails';

export const NOT_MEASURED = ' · not measured';

export const OPERATOR_DECIDES = ' An operator decides before the milestone counts.';

export const operatorNote = (note: string): string => `Operator note: “${note}”.`;

export const MILESTONE_LABEL = {
  PLANTED: 'Planting · month 0',
  DEAD: 'Dead report',
  REPLANTED: 'Replant',
} as const;
