// The pure rules of S23-S26 and S10 (display rules of s24 §4, s10 §4, the form mirrors of s23 §4 and s24-s25 §5) and the
// browser copy of the backend's audit functions (audit.ts, NFR-070): the seed, the sample, the canonical JSON and the report
// hash. The worker imports the four hash functions; no page module does, so a 5,000-tree sample never runs on the page thread.
import {
  concatHex,
  encodePacked,
  hexToBigInt,
  keccak256,
  stringToBytes,
  stringToHex,
  type Hex,
} from 'viem';
import type { JourneyStep } from '../../shared/ui/Journey';
import type { AuditSession, Challenge, Json, Sample, Submission } from './audit.api';
import * as copy from './audit.copy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const TREE_NUMBER = /^\d+$/u;
const ID_SHORT = 8;
const HASH_HEAD = 10;
const HASH_TAIL = 6;
const HASH_BASE = 16;
const LAST_BYTE = 2;
const BYTE_HEX = 2;
const SAMPLE_MIN = 1;
const SAMPLE_MAX = 100;
const PERCENT = 100;
const POLICY_SCALE = 100;
const STEPS = 3;
// the contract's milestone months (planting, then 3, 6, 12, 24, 36)
const MONTH_OF_MILESTONE = '0,3,6,12,24,36'.split(',').map(Number);
const MILESTONES = 6;
const PREVIEW_LIMIT = 21;
const DRAWN_LIMIT = 14;

export const isUuid = (value: string): boolean => UUID.test(value);

export const isTreeNumber = (value: string): boolean => TREE_NUMBER.test(value);

/** First 8 characters, upper case: `e9219997-…` → `E9219997`. */
export const shortId = (id: string): string => id.slice(0, ID_SHORT).toUpperCase();

/** `0x39e41cfd…35a4cd`; null → "—". */
export const shortHash = (hash: string | null): string =>
  hash === null ? copy.DASH : `${hash.slice(0, HASH_HEAD)}…${hash.slice(-HASH_TAIL)}`;

/** FR-206: the last byte XOR 1. */
export const flip = (hash: string): string =>
  hash.slice(0, -LAST_BYTE) +
  (parseInt(hash.slice(-LAST_BYTE), HASH_BASE) ^ 1).toString(HASH_BASE).padStart(BYTE_HEX, '0');

export const clampPercent = (done: number, total: number): number =>
  Math.round((done / Math.max(1, total)) * PERCENT);

export const previewOf = (population: readonly string[]): string[] =>
  population.slice(0, PREVIEW_LIMIT);

export const drawnOf = (population: readonly string[]): string[] =>
  population.slice(0, DRAWN_LIMIT);

// ---- the shared functions (audit.ts) ----

/** seed = keccak256(utf8(sessionId, lower case) ‖ blockHash). */
export const auditSeed = (sessionId: string, blockHash: Hex): Hex =>
  keccak256(concatHex([stringToHex(sessionId.toLowerCase()), blockHash]));

const ascending = (left: bigint, right: bigint): number => {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
};

/** Seeded Fisher-Yates over the population sorted ascending (numerically, FR-183): the first `size` ids in sample order. */
export const sampleTreeIds = (population: readonly bigint[], seed: Hex, size: number): bigint[] => {
  const items = [...new Set(population)].sort(ascending);

  for (let top = items.length - 1; top > 0; top -= 1) {
    const draw = hexToBigInt(keccak256(encodePacked(['bytes32', 'uint256'], [seed, BigInt(top)])));
    const other = Number(draw % BigInt(top + 1));
    const held = items[top] as bigint;

    items[top] = items[other] as bigint;
    items[other] = held;
  }

  return items.slice(0, Math.min(size, items.length));
};

/** JSON with the keys sorted at every level, so a report always hashes the same. */
const canonicalJson = (value: Json): string => {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }

  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((name) => `${JSON.stringify(name)}:${canonicalJson(value[name] as Json)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
};

export const reportHash = (report: Json): Hex => keccak256(stringToBytes(canonicalJson(report)));

// ---- S23 form mirror ----

/** `sampleSize`: an integer 1-100 (the form starts at 2); the server caps it at the population, the client never does. */
export const sampleSizeOf = (text: string): number | null => {
  const size = Number(text);

  return text.trim() !== '' && Number.isInteger(size) && size >= SAMPLE_MIN && size <= SAMPLE_MAX
    ? size
    : null;
};

// ---- S24 ----

export const pendingOf = (samples: readonly Sample[]): Sample[] =>
  samples.filter(({ finding }) => finding === null);

export const missingText = (samples: readonly Sample[]): string =>
  pendingOf(samples)
    .map(({ treeId }) => `#${treeId}`)
    .join(', ');

/** The four steps of the session: the first one not done is "now" (FR-186). */
export const stepsOf = (
  session: AuditSession,
  date: (iso: string) => string,
): { steps: JourneyStep[]; fill: number } => {
  const done = [
    true,
    session.findingsRecorded === session.sampleSize,
    session.challengesIssued > 0,
    session.status === 'closed',
  ];
  const notes = [
    date(session.createdAt),
    copy.findingsOf(session.findingsRecorded, session.sampleSize),
    copy.issuedOf(session.challengesIssued),
    session.closedAt === null ? copy.NOT_YET : date(session.closedAt),
  ];
  const icons = ['check', 'flag', 'clock', 'carbon'] as const;
  const labels = [copy.STEP_OPENED, copy.STEP_FINDINGS, copy.STEP_CHALLENGES, copy.STEP_CLOSED];
  const now = done.findIndex((isDone) => !isDone);
  const steps = labels.map((label, index): JourneyStep => {
    const state = done[index] === true ? 'done' : '';

    return {
      icon: icons[index] ?? 'check',
      label,
      note: notes[index] ?? '',
      state: index === now ? 'now' : state,
    };
  });

  return { steps, fill: (now < 0 ? STEPS : Math.max(0, now - 1)) / STEPS };
};

export const cardLinkLabel = (sample: Sample): string =>
  sample.finding === null ? copy.OPEN_EVIDENCE : copy.REVIEW_AGAIN;

export const challengeLabel = (challenge: Challenge): string =>
  challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1);

// ---- S25 ----

/** The wire index of a milestone is a month: `[0, 3, 6, 12, 24, 36][milestone]`. */
export const submissionMonth = (milestone: number | null): number =>
  MONTH_OF_MILESTONE[milestone ?? 0] ?? 0;

export const submissionTone = (status: string): string => {
  if (status === 'onchain') {
    return 'active';
  }

  return status === 'rejected' ? 'refunding' : 'funding';
};

export const scoreText = (submission: Submission): string =>
  submission.policy === null
    ? copy.DASH
    : String(Math.round(submission.policy.score / POLICY_SCALE));

/** "policy 9,580 · reasons", "prechecks failed · reasons" or "not scored yet": the small line of an evidence row. */
export const submissionLine = (submission: Submission): string => {
  const { policy } = submission;

  if (policy !== null) {
    const reasons = policy.reasons.length === 0 ? '' : ` · ${policy.reasons.join(', ')}`;

    return `${copy.POLICY} ${policy.score.toLocaleString('en-US')}${reasons}`;
  }

  const failed = submission.precheckResults.filter(({ ok }) => ok === false);

  return failed.length === 0
    ? copy.NOT_SCORED_YET
    : `${copy.PRECHECKS_FAILED} · ${failed.map(({ reason }) => reason ?? '').join(', ')}`;
};

export const hasIntegrity = (submission: Submission): boolean =>
  submission.precheckResults.length > 0 || submission.verification !== null;

export const milestonesShare = (paid: number): number => paid / MILESTONES;

export const notesOf = (text: string): string | null => (text.trim() === '' ? null : text.trim());

export const draftKey = (
  profile: { id: string; walletAddress: string | null },
  chainId: number,
  rest: string,
): string =>
  `treecord:draft:${profile.id}:${profile.walletAddress ?? 'no-wallet'}:${chainId}:audit:${rest}`;
