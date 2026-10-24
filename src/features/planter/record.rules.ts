// S19's decisions that need no screen (s19-record.md §3): what the URL asks for, why a target is blocked and where that
// leads, the capture step a phase is on, the GPS chip, and the lines of a sealed clip. The browser never runs the server's
// prechecks; it shows what capture-target and the send answer.
import type { CaptureKind, Fix, SealTarget } from '../evidence/evidence.rules';
import type { QueuedRecording } from '../evidence/queue';
import { MAX_GPS_ACCURACY_M } from '../evidence/evidence.config';
import type { Clip, Phase } from '../evidence/use-capture';
import { REASON_TEXT } from './planter.copy';
import { BLOCKED_BODY, BLOCKED_TITLE, MY_TREES, OPEN_HELD, heldBody } from './record.copy';
import type { CaptureTarget, TargetParams } from './record.api';

const TREE_KINDS: readonly string[] = ['ALIVE', 'DEAD', 'REPLANTED'];

const plantedTarget = (search: URLSearchParams): TargetParams | null => {
  const [tree, slot, campaign] = [search.get('tree'), search.get('slot'), search.get('campaign')];

  return slot !== null && campaign !== null && tree === null
    ? { kind: 'PLANTED', campaign, slotId: slot }
    : null;
};

const treeTarget = (kind: string, search: URLSearchParams): TargetParams | null => {
  const [tree, slot, campaign] = [search.get('tree'), search.get('slot'), search.get('campaign')];

  return tree !== null && slot === null && campaign === null && TREE_KINDS.includes(kind)
    ? { kind: kind as Exclude<CaptureKind, 'PLANTED'>, treeId: tree }
    : null;
};

/** The URL's target, or `null` for a bad link: no request is sent (FR-095). Both target kinds given is a bad link too. */
export const parseTarget = (search: URLSearchParams): TargetParams | null => {
  const kind = search.get('kind') ?? '';

  if (kind === 'PLANTED') {
    return plantedTarget(search);
  }

  return treeTarget(kind, search);
};

export type BlockedView = { title: string; body: string; to: string; link: string };

export const UNAVAILABLE: BlockedView = {
  title: BLOCKED_TITLE,
  body: BLOCKED_BODY,
  to: '/app/planter/trees',
  link: MY_TREES,
};

const reasonText = (reason: string): string => REASON_TEXT[reason] ?? reason;

/** A target that is not allowed: the first reason is the title; a held submission is the body and the link (§3). */
export const blockedOf = (target: CaptureTarget): BlockedView => {
  const [first = '', ...others] = target.reasons.map(reasonText);

  if (target.held !== null) {
    return {
      title: first,
      body: heldBody(target.held, target.kind, target.month),
      to: `/app/evidence/${target.held.id}`,
      link: OPEN_HELD,
    };
  }

  return {
    title: first === '' ? BLOCKED_TITLE : first,
    body: others.length === 0 ? BLOCKED_BODY : others.join(' · '),
    to: UNAVAILABLE.to,
    link: MY_TREES,
  };
};

/** The zero-based capture step a phase is on (the track's four steps). */
export const stepOf = (phase: Phase): number =>
  ({ idle: 0, starting: 0, live: 1, recording: 2, sealing: 3, review: 3 })[phase];

export const isCoarse = (fix: Fix | null): boolean => fix !== null && fix.acc > MAX_GPS_ACCURACY_M;

const COORD_DECIMALS = 6;

export const gpsPair = (fix: Fix): string =>
  `${fix.lat.toFixed(COORD_DECIMALS)}, ${fix.lon.toFixed(COORD_DECIMALS)}`;

/** "-7.424310, 109.239870 · ±8 m" */
export const gpsChip = (fix: Fix): string => `${gpsPair(fix)} · ±${fix.acc.toFixed(0)} m`;

export const chipTone = (fix: Fix | null): 'wait' | 'ok' | 'warn' => {
  if (fix === null) {
    return 'wait';
  }

  return isCoarse(fix) ? 'warn' : 'ok';
};

/** The tag the QR hint saw: the target's tag text; the challenge QR is `challenge.qr`, shown as its code. */
export const sawTag = (seen: ReadonlySet<string>, tag: string | null): boolean =>
  tag !== null && seen.has(tag);

/** What the capture-target names, as the seal copies it into the payload. */
export const sealTargetOf = (target: CaptureTarget): SealTarget => ({
  kind: target.kind,
  campaign: target.campaign.address.toLowerCase(),
  slotId: target.slotId,
  treeId: target.treeId,
  milestone: target.milestone,
  challenge: target.challenge?.code ?? null,
  tag: target.tag,
});

/** The queue row of a sealed clip: persisted before any network call, so a dying tab loses nothing. */
export const rowOf = (profileId: string, target: CaptureTarget, clip: Clip): QueuedRecording => ({
  id: crypto.randomUUID(),
  profileId,
  submissionId: null,
  kind: target.kind,
  campaign: {
    address: clip.payload.campaign,
    title: target.campaign.title,
    ...(target.campaign.regionName === undefined ? {} : { regionName: target.campaign.regionName }),
  },
  slotId: target.slotId,
  treeId: target.treeId,
  milestone: target.milestone,
  month: target.month,
  durationSec: clip.durationSec,
  sizeBytes: clip.sizeBytes,
  contentType: clip.contentType,
  capturedAt: clip.capturedAt,
  payload: clip.payload,
  canonical: clip.canonical,
  signature: clip.signature,
});
