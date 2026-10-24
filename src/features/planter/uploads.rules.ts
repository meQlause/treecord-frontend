// S20's display rules (s20-uploads.md §2.3), pure: the badge, the picture's step, the reason line of a rejected card, the
// filter groups, the counts and the facts of a queued card. The page shows what the server says; it re-derives nothing.
import { UPLOAD_WINDOW_MS } from '../evidence/evidence.config';
import type { QueuedRecording } from '../evidence/queue';
import { localDate, localDateTime } from '../../shared/format/datetime';
import { REASON_TEXT } from './planter.copy';
import type { UploadFilter, UploadItem, UploadsPage } from './planter.api';
import * as copy from './uploads.copy';

export type Filter = (typeof copy.UPLOAD_FILTERS)[number];

const SERVER_FILTER: Readonly<Record<Filter, UploadFilter>> = {
  All: 'all',
  Waiting: 'all',
  Sent: 'sent',
  Rejected: 'rejected',
};

const FILTER_PARAM: Readonly<Record<string, Filter>> = {
  waiting: 'Waiting',
  sent: 'Sent',
  rejected: 'Rejected',
};

/** The filter in `?filter=`; anything else is "All". */
export const parseFilter = (param: string | null): Filter => FILTER_PARAM[param ?? ''] ?? 'All';

export const paramOf = (filter: Filter): string | undefined =>
  filter === 'All' ? undefined : filter.toLowerCase();

/** Which server list a filter reads; "Waiting" never asks (`asks` is false) and reads the cached "all". */
export const serverFilterOf = (filter: Filter): { filter: UploadFilter; asks: boolean } => ({
  filter: SERVER_FILTER[filter],
  asks: filter !== 'Waiting',
});

/** Every loaded page as one list, with the newest page's total and summary. */
export const flattenUploads = (pages: UploadsPage[] | undefined) => {
  const last = pages?.at(-1);

  return {
    items: pages?.flatMap((page) => page.items) ?? [],
    total: last?.total ?? 0,
    summary: last?.summary,
  };
};

const BAD_STEP = { prechecks: 0, scored: 1, attested: 2 } as const;
const PIPELINE_OFFSET = 2;
const ONCHAIN_STEP = 4;
const REVIEW_STEP = 2;

/** The picture's step: −1 for a queued recording, the cross's step for a turned-back one. */
export const stepOf = (item: Pick<UploadItem, 'status' | 'pipeline'> | null): number => {
  if (item === null) {
    return -1;
  }

  if (item.status === 'onchain') {
    return ONCHAIN_STEP;
  }

  if (item.status === 'needs_review') {
    return REVIEW_STEP;
  }

  if (item.status === 'rejected' || item.status === 'failed') {
    return BAD_STEP[item.pipeline.failedAt ?? 'prechecks'];
  }

  return Math.max(0, item.pipeline.step - PIPELINE_OFFSET);
};

const reasonCopy = (reason: string): string => REASON_TEXT[reason] ?? reason;

/** Why a rejected card was turned back (FR-112): the failed prechecks, the operator's note, or the policy reasons. */
export const rejectedLine = (item: UploadItem): string | null => {
  if (item.status === 'failed') {
    return null;
  }

  const { rejection } = item;

  if (rejection === null) {
    return copy.TURNED_BACK;
  }

  if (rejection.stage === 'operator') {
    return copy.operatorNote(rejection.note ?? '');
  }

  const withValue = rejection.stage === 'precheck';

  return rejection.reasons
    .map(({ reason, value }) =>
      withValue && value !== null ? `${reasonCopy(reason)} (${value})` : reasonCopy(reason),
    )
    .join(' · ');
};

/** The title of a sent card: the tree, or the slot of a planting not yet mirrored. */
export const titleOf = (item: { treeId: string | null; slotId: string | null }): string =>
  item.treeId === null ? `Slot #${item.slotId ?? ''}` : `Tree #${item.treeId}`;

/** A queued recording whose upload window has closed stays on the list, marked, and can no longer be sent (decision (j)). */
export const isExpired = (row: Pick<QueuedRecording, 'capturedAt'>, now: number): boolean =>
  now - Date.parse(row.capturedAt) > UPLOAD_WINDOW_MS;

/** The facts of a card: "Recorded", "Video", "GPS", "Upload by". */
export const factsOf = (
  captured: string,
  durationSec: number,
  accM: number | null,
): [string, string][] => [
  [copy.FACT_RECORDED, localDateTime(captured)],
  [copy.FACT_VIDEO, `${durationSec} s`],
  [copy.FACT_GPS, accM === null ? copy.KEPT_ON_SERVER : `±${accM} m`],
  [copy.FACT_UPLOAD_BY, localDate(Date.parse(captured) + UPLOAD_WINDOW_MS)],
];

/** Local rows whose submission the server list already holds are hidden: the server copy wins (§2.4). */
export const withoutSent = (rows: QueuedRecording[], items: UploadItem[]): QueuedRecording[] =>
  rows.filter(
    (row) => row.submissionId === null || !items.some(({ id }) => id === row.submissionId),
  );

/** "N recordings" and the filter's own total (§2.3 Meta): All is local + all, Waiting is local, the rest are the server's. */
export const shownTotal = (
  filter: Filter,
  local: number,
  summary: UploadsPage['summary'] | undefined,
): number | null => {
  if (filter === 'Waiting') {
    return local;
  }

  if (summary === undefined) {
    return null;
  }

  return { All: local + summary.all, Sent: summary.sent, Rejected: summary.rejected }[filter];
};
