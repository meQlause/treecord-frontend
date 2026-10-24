// Every sentence of S23-S26 and S10 (s23, s24, s25, s26 and s10 feature documents). Verbatim from the mockup
// (audit-pages.jsx), the SRS or error-handling §4; COPY-300..307, 402 and 405 stay lorem until the owner approves them.
import type { Words } from '../planter/evidence.copy';

export type { Words };

// ---- shared ----
export const SESSION_NOT_FOUND = 'Session not found';

export const BACK_TO_AUDIT = 'Back to Audit';

export const TREE_NOT_IN_SAMPLE = 'Tree not in this sample';

export const UNAVAILABLE =
  'Could not load this page · Your inputs and local records are unchanged.';

export const TRY_AGAIN = 'Try again';

const CONFIRM = 'Confirm';

const CANCEL = 'Cancel';

const CLOSE = 'Close';

export const REPRODUCE = 'Reproduce';

export const COPY_VALIDATION = 'COPY-001';

export const FINDING_LABEL = {
  ok: 'OK',
  issue: 'Issue',
  needs_followup: 'Follow-up',
} as const;

/** The badge class of a finding: `ok` active, `issue` refunding, anything else funding. */
export const FINDING_TONE = {
  ok: 'active',
  issue: 'refunding',
  needs_followup: 'funding',
} as const;

export const NO_FINDING_YET = 'No finding yet';

// ---- S23 Open audit ----
export const OPEN_EYEBROW = 'AUDITOR WORKSPACE';

export const OPEN_TITLE = 'A closer look.';

export const OPEN_EM = 'A clearer record.';

export const OPEN_COORD = '10 / AUDIT';

export const OPEN_ARIA = 'Open a session';

export const KICKER_ONE = '01 · Open a session';

export const PICK_CAMPAIGN = 'Pick the campaign,';

export const NOT_THE_TREES = 'not the trees';

export const KICKER_TWO = '02 · How the sample is drawn';

export const SEEDED_BY = 'Seeded by';

export const THE_CHAIN = 'the chain';

export const F_CAMPAIGN = 'Campaign';

export const F_SAMPLE_SIZE = 'Sample size';

export const SAMPLE_HINT = '1–100, capped to the campaign’s indexed trees.';

export const OPEN_SESSION = 'Open session';

export const NO_TREES = 'No trees planted in this campaign yet.';

export const SIZE_COPY = 'COPY-300';

export const LOAD_MORE_COPY = 'COPY-301';

export const LOAD_MORE_FAILED_COPY = 'COPY-302';

export const FILTER_EMPTY_COPY = 'COPY-405';

export const SESSIONS = 'Sessions';

export const SESSIONS_KICKER = 'Every sample, reproducible.';

export const STATUS_FILTERS = ['All', 'Open', 'Closed'] as const;

export const STATUS_LABEL = 'Session status';

export const NEWEST_FIRST = 'Newest first';

export const sessionsMeta = (total: number): string => `${total} sessions`;

export const NO_SESSIONS = 'No sessions yet';

export const NO_SESSIONS_BODY = 'Open one above; its sample is drawn from the latest block.';

export const CLEAR_FILTERS = 'Clear filters';

export const OPEN_BADGE = 'Open';

export const CLOSED_BADGE = 'Closed';

export const sampleOf = (sample: number, population: number): string =>
  `${sample} of ${population}`;

export const blockOf = (block: string): string => `Block #${Number(block).toLocaleString('en-US')}`;

export const FINDINGS_UNIT = 'findings';

export const FINDINGS_RECORDED = 'Findings recorded';

export const challengesOf = (count: number): string =>
  `${count} challenge${count === 1 ? '' : 's'}`;

export const reportOf = (short: string): string => `Report ${short}`;

export const REPORT_ON_CLOSE = 'Report on close';

export const CONTINUE_SESSION = 'Continue the session';

export const READ_REPORT = 'Read the report';

export const FLOW_LABELS = ['BLOCK HASH', 'SEED', 'SHUFFLE', 'SAMPLE'] as const;

export const FLOW_ARIA =
  'The block hash and session id are hashed into a seed; the seed shuffles the sorted population; the first trees are the sample';

export const FLOW_CAPTION = 'keccak256 · seeded Fisher–Yates · anyone can recompute it';

// ---- S24 Audit session ----
export const sessionEyebrow = (status: string, title: string): string =>
  `AUDIT SESSION · ${status.toUpperCase()} · ${title.toUpperCase()}`;

export const sessionTitle = (size: number): string => `${size} trees,`;

export const DRAWN_BY_A_BLOCK = 'drawn by a block.';

export const sessionCoord = (shortId: string): string => `SESSION / ${shortId}`;

export const PROGRESS = 'Session';

export const PROGRESS_ARIA = 'Session progress';

export const STEP_OPENED = 'Opened';

export const STEP_FINDINGS = 'Findings';

export const STEP_CHALLENGES = 'Challenges';

export const STEP_CLOSED = 'Closed';

export const NOT_YET = 'not yet';

export const findingsOf = (done: number, size: number): string => `${done} of ${size}`;

export const issuedOf = (count: number): string => `${count} issued`;

export const FROZEN_SAMPLE = 'Frozen sample';

export const FROZEN_KICKER = 'Positions fixed by the seed.';

export const IN_SAMPLE_ORDER = 'In sample order';

export const treesMeta = (size: number): string => `${size} trees`;

export const position = (index: number): string => `Position ${index + 1}`;

export const treeNumber = (id: string): string => `Tree #${id}`;

export const NO_CHALLENGE = 'no challenge';

export const challengeLine = (code: string, status: string): string =>
  `Challenge ${code} · ${status}`;

export const OPEN_THE_EVIDENCE = 'Open the evidence to record a finding';

export const OPEN_EVIDENCE = 'Open evidence';

export const REVIEW_AGAIN = 'Review again';

export const CLOSE_THE_SESSION = 'Close the session';

export const missingLine = (missing: string): string => `Still missing a finding: ${missing}.`;

export const EVERY_TREE_HAS_FINDING =
  'Every sampled tree has a finding. Closing freezes the report and publishes its hash.';

export const SUMMARY_LABEL = 'Summary (optional)';

export const PRIVATE_HINT = 'Private: not published, but sealed into the report hash.';

export const CLOSE_SESSION = 'Close session';

export const CLOSE_REVIEW = {
  region: 'Review Close session',
  summary: 'The report is frozen, hashed (keccak256 of its canonical JSON) and becomes read-only.',
  confirm: CONFIRM,
  cancel: CANCEL,
  close: CLOSE,
  done: 'Closed',
} as const;

export const SESSION_FACT = 'Session';

export const RAIL_FINDINGS = 'Findings';

export const RAIL_RECORDED = 'Recorded';

export const RAIL_TREES = 'trees';

export const RAIL_CHALLENGES = 'Challenges';

export const RAIL_ISSUED = 'issued';

export const READY_TO_CLOSE = 'Ready to close';

export const stillToReview = (count: number): string => `${count} still to review`;

export const EVERY_TREE_REVIEWED = 'Every tree reviewed';

export const FINDINGS_ARE_YOURS = 'Findings are yours; the sample was the chain’s.';

export const SESSION_RECORD = 'Session record';

export const R_OPENED = 'Opened';

export const R_SEED_BLOCK = 'Seed block';

export const R_BLOCK_HASH = 'Block hash';

export const R_POPULATION = 'Population';

export const R_REPORT_HASH = 'Report hash';

export const ON_CLOSE = 'On close';

export const REPORT = 'Report';

export const ALL_SESSIONS = 'All sessions';

export const ANYONE_CAN_RECOMPUTE = 'Anyone can recompute the sample.';

export const populationOf = (size: number): string => `${size} trees`;

// ---- S25 Sampled tree ----
export const treeEyebrow = (index: number, size: number): string =>
  `SAMPLED TREE · POSITION ${index + 1} OF ${size}`;

export const treeHeading = (id: string): string => `Tree #${id},`;

export const UNDER_REVIEW = 'under review.';

export const EVIDENCE_BUNDLE = 'Evidence bundle';

export const NO_SUBMISSIONS = 'No submissions';

export const NO_SUBMISSIONS_BODY = 'This tree has no evidence in the local record.';

export const submissionLabel = (kind: string, month: number): string => `${kind} · month ${month}`;

export const POLICY = 'policy';

export const PRECHECKS_FAILED = 'prechecks failed';

export const NOT_SCORED_YET = 'not scored yet';

export const INTEGRITY_CHECKS = 'Integrity checks';

export const INTEGRITY_EMPTY =
  'Integrity results appear once a submission has been prechecked: signature, device, hash, freshness, GPS, location, one per milestone.';

export const SIGNATURE_LABEL = 'Device signature over the payload';

export const VIDEO_LABEL = 'Video bytes match the signed SHA-256';

export const CANONICAL_COPY = 'COPY-303';

export const EVIDENCE_HASH_COPY = 'COPY-304';

export const NOT_CHECKED_COPY = 'COPY-305';

export const REVOKED_COPY = 'COPY-306';

export const FINDING_SECTION = 'Finding';

export const NOTES_LABEL = 'Notes (optional)';

export const NOTES_FACT = 'Notes';

export const NONE = 'None';

export const SAVE_FINDING = 'Save finding';

export const FINDING_SAVED = 'Finding saved';

export const SESSION_CLOSED = 'This session is closed.';

export const NO_FINDING_RECORDED = 'No finding recorded yet.';

export const yourFinding = (label: string): string => `Your finding: ${label}`;

export const treeCaption = 'Status';

export const MILESTONES_PAID = 'Milestones paid';

export const GROWTH = 'Growth to month 36';

export const monthOf = (month: number): string => `month ${month}`;

export const PROVE_IT_NOW = 'Prove it now';

export const EYEBROW_OPEN_CHALLENGE = 'OPEN CHALLENGE';

export const EYEBROW_NO_CHALLENGE = 'NO CHALLENGE YET';

export const F_ISSUED = 'Issued';

export const F_EXPIRES = 'Expires';

export const F_STATUS = 'Status';

export const answeredBy = (id: string): string => `Answered by ${id}`;

export const ISSUE_CHALLENGE = 'Issue challenge';

export const CHALLENGE_REVIEW = {
  region: 'Review Issue challenge',
  summary:
    'A random 4-character code goes to the planter. Their next recording of this tree must show it; it expires in 2 time units.',
  confirm: CONFIRM,
  cancel: CANCEL,
  close: CLOSE,
  done: 'Challenge issued to the planter',
} as const;

export const CHALLENGE_ISSUED = 'Challenge issued to the planter';

export const mustShow = (code: string): string => `The next recording must show ${code}.`;

export const ALIVE_ONLY = 'Alive sampled trees only, one open code each.';

export const CODE_CAPTION = 'SHOW IN THE SCENE';

export const CHALLENGE_ERRORS: Readonly<Record<string, string>> = {
  challenge_active: 'This tree already has an open challenge.',
  tree_not_alive: 'Only Alive trees can be challenged.',
  session_closed: SESSION_CLOSED,
  not_found: 'Only sampled trees can be challenged.',
};

// ---- S26 Audit report ----
export const reportEyebrow = (title: string): string =>
  `CLOSED AUDIT REPORT · ${title.toUpperCase()}`;

export const REPORT_TITLE = 'Audit report,';

export const REPORT_EM = 'hashed and closed.';

export const reportCoord = (shortId: string): string => `REPORT / ${shortId}`;

export const NO_SUMMARY = 'No summary.';

export const REPORT_NOT_CLOSED = 'Report not closed';

export const COMPLETE_AND_CLOSE = 'Complete findings and close session';

export const FINDINGS_HEADING = 'Findings';

export const RING_UNIT = 'TREES';

export const ringLabel = (fine: number, issue: number, followup: number): string =>
  `${fine} ok, ${issue} issue, ${followup} needs followup`;

export const CHALLENGES_HEADING = 'Challenges';

export const NO_CHALLENGES = 'No challenges were issued in this session.';

export const answered = (id: string): string => `answered by ${id}`;

export const expiresOn = (date: string): string => `expires ${date}`;

export const SEED_INPUTS = 'Seed inputs';

export const R_SESSION = 'Session';

export const R_BLOCK = 'Block';

export const R_SAMPLE = 'Sample';

export const R_CLOSED = 'Closed';

export const RAIL_REPORT = 'Report';

export const PUBLISHED_HASH = 'Published hash';

export const SEALED = 'Sealed';

export const FOUND_OK = 'Found OK';

export const totalsLine = (fine: number, issue: number, followup: number): string =>
  `${fine} ok · ${issue} issue · ${followup} follow-up`;

export const EDIT_CHANGES_HASH = 'Any edit to the report changes its hash.';

export const REPORT_HASH = 'Report hash';

export const HASH_EYEBROW = 'KECCAK256 · CANONICAL JSON';

export const PUBLIC_PRIVATE =
  'Findings, totals and challenges are public. Your notes and summary stay private, sealed into this hash.';

export const COPY_HASH = 'Copy hash';

export const COPIED = 'Copied';

export const BACK_TO_SESSION = 'Back to the session';

export const NOT_A_CERTIFICATE = 'Sampling consistency is not a health or carbon certificate.';

// ---- S10 Reproduce ----
export const reproduceEyebrow = (title: string): string =>
  `PUBLIC REPRODUCTION · ${title.toUpperCase()}`;

export const REPRODUCE_TITLE = 'Recompute it';

export const REPRODUCE_EM = 'yourself.';

export const reproduceCoord = (shortId: string): string => `REPRODUCE / ${shortId}`;

export const RECOMPUTATION = 'Recomputation';

export const INPUTS_AND_RESULTS = 'Inputs and results';

export const STEP_LABELS = ['Inputs', 'Seed', 'Shuffle', 'Sample'] as const;

export const blockStep = (block: string): string =>
  `block #${Number(block).toLocaleString('en-US')}`;

export const R_SEED = 'Seed';

export const R_STORED = 'Stored sample';

export const R_RECOMPUTED = 'Recomputed sample';

export const R_PRIVATE_NOTES = 'Private notes';

export const NOT_CLOSED_YET = 'Session not closed yet';

export const sealed = 'Sealed, not published · ';

export const DASH = '—';

export const REPRODUCTION = 'Reproduction';

export const SAMPLE_CHECK = 'Sample check';

export const REPORT_CHECK = 'Report check';

export const MATCH = 'Match';

export const MISMATCH = 'Mismatch';

export const PUBLISHED_INPUTS = 'Published inputs';

export const EXACTLY_AS_STORED = 'Exactly as stored';

export const TAMPERED_INPUT = 'Tampered input';

export const ONE_BIT_FLIPPED = 'One bit of the block hash flipped';

export const NOT_HEALTH = 'Sampling consistency does not prove tree health.';

export const TAMPER_TEST = 'Tamper test';

export const TAMPER_EYEBROW = 'CHANGE ONE BIT, WATCH THE SAMPLE';

export const FLIP = 'Flip one bit of the block hash';

export const RESTORE = 'Restore the real block hash';

export const SAMPLE_MATCHES =
  'Recomputed from the published inputs, the sample is exactly the one the auditor reviewed.';

export const SAMPLE_DIFFERS =
  'With a different block hash the sample changes completely: the auditor could not have chosen it.';

export const RECOMPUTE_FAILED_COPY = 'COPY-307';

/** COPY-402 as the error toast reads it (a toast takes text, not an element): lorem until approved. */
export const COPY_REFUSED_TEXT = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
