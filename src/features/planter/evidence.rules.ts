// S21's display rules (s21-evidence.md §2.3), pure: the title and the note, the labels of the precheck rows, the gauges and
// their bands, the pipeline and the verdict, the keyframe times. The page shows the server's decision; nothing is re-judged.
import {
  CHECK_IN_RADIUS_M,
  MAX_GPS_ACCURACY_M,
  SERVER_VIDEO_MAX_SEC,
  SERVER_VIDEO_MIN_SEC,
  UPLOAD_WINDOW_HOURS,
} from '../evidence/evidence.config';
import { POLICY_THRESHOLDS, TAG_LIMITS, type Limits } from '../evidence/policy.config';
import { REASON_TEXT } from './planter.copy';
import type { AiScores, Evidence, PrecheckRow } from './evidence.api';
import type { TargetParams } from './record.api';
import * as copy from './evidence.copy';

const reasonCopy = (reason: string): string => REASON_TEXT[reason] ?? reason;

/** The reasons a rejection names, without the operator's own (their words come from the note). */
const reasonsOf = (evidence: Evidence): string =>
  evidence.rejectReasons
    .filter((reason) => reason !== 'operator_rejected')
    .map(reasonCopy)
    .join(', ');

export const titleWord = (status: string): string =>
  copy.TITLE_WORD[status] ?? copy.DEFAULT_TITLE_WORD;

/** Who turned it back and why: the operator's note, the policy's reasons, or the prechecks' (FR-117). */
const rejectedNote = (evidence: Evidence): string => {
  if (evidence.review?.decision === 'rejected') {
    return `Rejected: ${evidence.review.note ?? ''}`;
  }

  const stage = evidence.ai === null ? 'before scoring' : 'by the policy';

  return `Rejected ${stage}: ${reasonsOf(evidence)}.`;
};

/** The status note under the title (FR-117). */
export const noteOf = (evidence: Evidence): copy.Words =>
  evidence.status === 'rejected'
    ? rejectedNote(evidence)
    : (copy.STATUS_NOTE[evidence.status] ?? '');

export const targetOf = (evidence: Pick<Evidence, 'treeId' | 'slotId'>): string =>
  evidence.treeId === null ? `Slot #${evidence.slotId ?? ''}` : `Tree #${evidence.treeId}`;

export const eyebrowOf = (evidence: Evidence): string =>
  `EVIDENCE · ${evidence.kind} · ${targetOf(evidence).toUpperCase()}`;

const SHORT_ID = 8;

export const coordOf = (id: string): string => `EVIDENCE / ${id.slice(0, SHORT_ID).toUpperCase()}`;

const ownershipLabel = (kind: string): copy.Words =>
  kind === 'PLANTED' ? 'You hold this slot' : { copyId: 'COPY-210' };

const treeStatusLabel = (kind: string): string =>
  kind === 'REPLANTED' ? 'Tree is Dead, before its replant deadline' : 'Tree is Alive';

const TARGET_FREE: Readonly<Record<string, string>> = {
  ALIVE: 'Milestone not checked in yet',
  PLANTED: 'Slot not planted yet',
  DEAD: 'Not already reported dead',
  REPLANTED: 'Not already replanted',
};

const targetFreeLabel = (kind: string): string => TARGET_FREE[kind] ?? '';

const regionLabel = (evidence: Evidence): string =>
  `Inside the campaign region (${(evidence.campaign.regionRadiusM ?? 0).toLocaleString('en-US')} m)`;

/** The label of a precheck row (FR-115), by the server's `check`; numbers come from configuration. */
export const checkLabel = (row: PrecheckRow, evidence: Evidence): copy.Words => {
  const { kind } = evidence;
  const labels: Readonly<Record<string, copy.Words>> = {
    device: 'Payload names this device',
    signature: 'Device signature over the payload',
    video_hash: 'Video bytes match the signed SHA-256',
    unique_video: { copyId: 'COPY-208' },
    capture_time: `Captured within ${UPLOAD_WINDOW_HOURS} hours, not in the future`,
    gps_accuracy: `GPS accuracy ${MAX_GPS_ACCURACY_M} m or better`,
    location:
      kind === 'PLANTED'
        ? regionLabel(evidence)
        : `Within ${CHECK_IN_RADIUS_M} m of where the tree was planted`,
    duration: `Video ${SERVER_VIDEO_MIN_SEC}–${SERVER_VIDEO_MAX_SEC} seconds`,
    ownership: ownershipLabel(kind),
    campaign_status: { copyId: 'COPY-209' },
    tree_status: treeStatusLabel(kind),
    milestone_window: `Month ${evidence.month ?? 0} window open`,
    target_free: targetFreeLabel(kind),
    challenge: challengeLabel(evidence),
    tag: evidence.payload?.tag ? `Carries tree tag ${evidence.payload.tag}` : 'Tree tag issued',
  };

  return labels[row.check] ?? row.check;
};

const challengeLabel = (evidence: Evidence): copy.Words => {
  const code = evidence.challenge?.code ?? evidence.payload?.challenge ?? null;

  return code === null ? { copyId: 'COPY-211' } : `Carries challenge code ${code}`;
};

/** "✓", "✕" or "—" for a row that was not checked. */
export const markOf = (passed: boolean | null): string => {
  if (passed === null) {
    return '—';
  }

  return passed ? '✓' : '✕';
};

/** The small line under a row's label: the value judged, the reason it failed, or that it was not checked. */
export const detailOf = (row: PrecheckRow): string => {
  const parts = [row.value ?? ''];

  if (row.ok === false && row.reason !== null) {
    parts.push(row.reason);
  }

  if (row.ok === null) {
    parts.push(copy.NOT_CHECKED);
  }

  return parts.filter((part) => part !== '').join(' · ');
};

export type Band = 'ok' | 'near' | 'bad';

export type Gauge = { label: string; value: number | null; limits: Limits; up: boolean };

const gauge = (label: string, value: number | null, limits: Limits, up = true): Gauge => ({
  label,
  value,
  limits,
  up,
});

/** The gauges that exist for every scored submission. */
const coreGauges = (scores: AiScores): Gauge[] => [
  gauge('Liveness', scores.liveness, POLICY_THRESHOLDS.liveness),
  gauge('Tree presence', scores.treePresence, POLICY_THRESHOLDS.treePresence),
  gauge('Recapture', scores.recapture, POLICY_THRESHOLDS.recapture, false),
  gauge('Duplicate', scores.duplicate?.maxSimilarity ?? null, POLICY_THRESHOLDS.duplicate, false),
];

/** The gauges that depend on the kind (growth: ALIVE only), the challenge and the tag. */
const extraGauges = (evidence: Evidence, scores: AiScores): Gauge[] => {
  const tag = evidence.payload?.tag ?? null;
  const tagRead = scores.tagDecoded === tag ? 1 : 0;
  const extras: (Gauge | null)[] = [
    evidence.kind === 'ALIVE'
      ? gauge('Growth', scores.growthConsistency, POLICY_THRESHOLDS.growthConsistency)
      : null,
    scores.challengeVisible === null
      ? null
      : gauge('Challenge code', scores.challengeVisible, POLICY_THRESHOLDS.challengeVisible),
    tag === null ? null : gauge('Tree tag read', tagRead, TAG_LIMITS),
  ];

  return extras.filter((row): row is Gauge => row !== null);
};

/** The gauges of a scored submission, in the order the page draws them. */
export const gaugesOf = (evidence: Evidence): Gauge[] => {
  const scores = evidence.ai?.scores;

  return scores === undefined ? [] : [...coreGauges(scores), ...extraGauges(evidence, scores)];
};

/** The band colour of a score against the policy: missing is "near" (not measured). */
export const bandOf = ({ value, limits, up }: Gauge): Band => {
  if (value === null) {
    return 'near';
  }

  const [worse, borderline] = up
    ? [value < limits.reject, value < limits.review]
    : [value > limits.reject, value > limits.review];

  if (worse) {
    return 'bad';
  }

  return borderline ? 'near' : 'ok';
};

export const bandNote = (band: Band, value: number | null): string => {
  if (band === 'ok') {
    return '';
  }

  if (band === 'bad') {
    return copy.FAILS;
  }

  return value === null ? copy.NOT_MEASURED : copy.BORDERLINE;
};

const POLICY_WORD: Readonly<Record<string, string>> = {
  pass: 'passes',
  needs_review: 'needs review',
};

export const policyWord = (decision: string | null): string =>
  POLICY_WORD[decision ?? ''] ?? 'rejected';

export const policyBand = (decision: string | null): Band => {
  if (decision === 'pass') {
    return 'ok';
  }

  return decision === 'needs_review' ? 'near' : 'bad';
};

/** The AI note under the gauges: the policy's verdict and why, then the operator's note and nothing else. */
export const aiNoteOf = (evidence: Evidence): string => {
  const decision = evidence.policyDecision;
  const operator = evidence.review?.note ? ` ${copy.operatorNote(evidence.review.note)}` : '';

  if (decision === 'pass') {
    return `${copy.PASS_NOTE}${operator}`;
  }

  const lead = decision === 'needs_review' ? 'Borderline' : 'Rejected';
  const decides = decision === 'needs_review' ? copy.OPERATOR_DECIDES : '';

  return `${lead}: ${reasonsOf(evidence)}.${decides}${operator}`;
};

export type StepState = 'done' | 'now' | 'bad' | '';

/** Step i (1 to 5) is done before the server's step, current at it, failed at it when turned back or failed. */
export const stepStates = (evidence: Evidence): StepState[] =>
  copy.PIPELINE_STEPS.map((_label, index) => {
    const step = index + 1;
    const { status, pipeline } = evidence;

    if (status === 'onchain' || step < pipeline.step) {
      return 'done';
    }

    if (step !== pipeline.step) {
      return '';
    }

    return status === 'rejected' || status === 'failed' ? 'bad' : 'now';
  });

const STEPS = copy.PIPELINE_STEPS.length;

/** Where the pipeline stands, in words: the step's name, or "Operator review" while a person decides. */
const whereOf = (status: string, step: number): string =>
  status === 'needs_review' ? copy.OPERATOR_REVIEW : (copy.PIPELINE_STEPS[step - 1] ?? '');

export type Verdict = {
  caption: string;
  value: string;
  unit: string;
  share: number;
  shareNote: string;
};

/** The verdict card: "14/14 checks" while the prechecks hold, else the status; the share is the pipeline's. */
export const verdictOf = (evidence: Evidence): Verdict => {
  const { status, pipeline, precheckResults: rows } = evidence;
  const checked = rows.filter((row) => row.ok !== null);
  const clean = rows.length > 0 && rows.every((row) => row.ok !== false);
  const stopped = status === 'rejected' || status === 'failed';
  const where = whereOf(status, pipeline.step);

  return {
    caption: clean ? copy.PRECHECKS_PASSED : copy.STATUS_CAPTION,
    value: clean
      ? `${checked.filter((row) => row.ok).length}/${checked.length}`
      : copy.capitalised(status),
    unit: clean ? copy.CHECKS_UNIT : '',
    share: stopped ? 0 : pipeline.step / STEPS,
    shareNote: stopped ? copy.capitalised(status) : `${where} · step ${pipeline.step} of ${STEPS}`,
  };
};

const DECIMALS = 1;

/** The time label of keyframe `index` of `frames`: spread over the recording, one decimal; "0.0 s" alone for one frame. */
export const frameTime = (index: number, frames: number, durationSec: number): string =>
  `${(frames === 1 ? 0 : (index * durationSec) / (frames - 1)).toFixed(DECIMALS)} s`;

/** The capture target a rejected submission would be recorded again for, to ask whether it is still eligible. */
export const recordAgainParams = (evidence: Evidence): TargetParams | null => {
  if (evidence.kind === 'PLANTED') {
    return evidence.slotId === null
      ? null
      : { kind: 'PLANTED', campaign: evidence.campaign.address, slotId: evidence.slotId };
  }

  return evidence.treeId === null ? null : { kind: evidence.kind, treeId: evidence.treeId };
};

/** Where "Record again" goes (S19's own URL). */
export const recordAgainOf = (evidence: Evidence): string | null => {
  if (evidence.kind === 'PLANTED') {
    return evidence.slotId === null
      ? null
      : `/app/planter/record?campaign=${evidence.campaign.address}&slot=${evidence.slotId}&kind=PLANTED`;
  }

  return evidence.treeId === null
    ? null
    : `/app/planter/record?tree=${evidence.treeId}&kind=${evidence.kind}`;
};
