// S19's three server conversations (s19-record.md §2): the capture-target read on mount, and the send of a sealed
// recording — upload-url, the presigned PUT, submit. The recording is already in the queue when the send runs; it leaves
// the queue only when submit answers. The PUT carries no Authorization (the presigned URL is the credential).
import { useQuery } from '@tanstack/react-query';
import { api } from '../../app/session/api';
import { useAccountKey } from '../../app/session/use-account-key';
import { ApiError } from '../../shared/api/errors';
import { finishRecording, setSubmissionId, type QueuedRecording } from '../evidence/queue';
import type { CaptureKind } from '../evidence/evidence.rules';

export type CaptureTarget = {
  kind: CaptureKind;
  slotId: string | null;
  treeId: string | null;
  milestone: number;
  month: number | null;
  campaign: { address: string; title: string; regionName?: string; regionRadiusM?: number };
  tag: string | null;
  challenge: { code: string; qr: string } | null;
  reference: { kind: 'region' | 'tree'; radiusM: number } | null;
  allowed: boolean;
  reasons: string[];
  held: { id: string; status: string } | null;
};

/** The URL's target: a tree kind names `treeId`, PLANTED names `campaign` and `slotId` (the URL says `slot`). */
export type TargetParams =
  | { kind: Exclude<CaptureKind, 'PLANTED'>; treeId: string }
  | { kind: 'PLANTED'; campaign: string; slotId: string };

/** `GET /evidence/capture-target`; read on mount, never refetched while capturing (a change shows at upload). */
export const useCaptureTarget = (params: TargetParams | null) => {
  const { ready, key } = useAccountKey();

  return useQuery({
    queryKey: ['evidence', 'capture-target', ...key, params],
    queryFn: ({ signal }) =>
      api<CaptureTarget>('/evidence/capture-target', { query: { ...params }, signal }),
    enabled: ready && params !== null,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

type UploadUrl = {
  submissionId: string;
  upload: { method: 'PUT'; url: string; headers: Record<string, string>; expiresAt: string };
};

/** What a send ends in; the page shows `failure`, or opens S21 for `sent`. */
export type SendFailure =
  | { type: 'refused'; reasons: string[] }
  | {
      type: 'upload-failed' | 'video-not-uploaded' | 'payload-mismatch' | 'target-gone' | 'invalid';
    }
  | { type: 'blocked'; code: string };

/** The one failure that needs no detail: the recording stays queued and S20 can send it. */
export const UPLOAD_FAILED: SendFailure = { type: 'upload-failed' };

export type SendResult =
  | { type: 'sent'; submissionId: string; rejected: boolean }
  | { type: 'failed'; failure: SendFailure };

const reasonsOf = (error: ApiError): string[] => {
  const { reasons } = (error.details ?? {}) as { reasons?: unknown };

  return Array.isArray(reasons) ? reasons.map(String) : [];
};

const uploadBody = (row: QueuedRecording) => ({
  kind: row.kind,
  campaign: row.payload.campaign,
  ...(row.kind === 'PLANTED' ? { slotId: row.slotId } : { treeId: row.treeId }),
  milestone: row.milestone,
  sha256: row.payload.videoSha256,
  sizeBytes: row.sizeBytes,
  durationSec: row.durationSec,
  contentType: row.contentType,
});

const requestLink = (row: QueuedRecording): Promise<UploadUrl> =>
  api<UploadUrl>('/evidence/upload-url', { method: 'POST', body: uploadBody(row) });

/** The presigned PUT: the clip unchanged, the headers exactly as given, nothing else. */
const putClip = async (link: UploadUrl, blob: Blob): Promise<boolean> => {
  try {
    const response = await fetch(link.upload.url, {
      method: link.upload.method,
      headers: link.upload.headers,
      body: blob,
    });

    return response.ok;
  } catch {
    return false;
  }
};

/** One PUT, then one more with a fresh link (the first may have expired); `false` after the second failure. */
const upload = async (
  row: QueuedRecording,
  blob: Blob,
  first: UploadUrl,
): Promise<UploadUrl | null> => {
  if (await putClip(first, blob)) {
    return first;
  }

  const fresh = await requestLink(row);

  return (await putClip(fresh, blob)) ? fresh : null;
};

const submit = (submissionId: string, row: QueuedRecording) =>
  api(`/evidence/${submissionId}/submit`, {
    method: 'POST',
    body: { payload: row.payload, canonical: row.canonical, signature: row.signature },
  });

const FAILED_BY_CODE: Readonly<Record<string, SendFailure>> = {
  payload_mismatch: { type: 'payload-mismatch' },
  validation_error: { type: 'invalid' },
  not_found: { type: 'target-gone' },
  internal_error: UPLOAD_FAILED,
  service_unavailable: UPLOAD_FAILED,
  network: UPLOAD_FAILED,
  timeout: UPLOAD_FAILED,
};

/** Maps an answer to the failure the review shows; the navigation codes are rethrown so the session handler runs. */
const failureOf = (error: unknown): SendFailure => {
  if (!(error instanceof ApiError)) {
    return UPLOAD_FAILED;
  }

  if (error.class === 'navigation') {
    throw error;
  }

  if (error.code === 'precheck_failed') {
    return { type: 'refused', reasons: reasonsOf(error) };
  }

  return FAILED_BY_CODE[error.code] ?? { type: 'blocked', code: error.code };
};

const sentFrom = async (
  row: QueuedRecording,
  id: string,
  rejected: boolean,
): Promise<SendResult> => {
  await finishRecording(row, id);

  return { type: 'sent', submissionId: id, rejected };
};

/** submit once; a 409 `video_not_uploaded` re-PUTs once and submits again (§5). */
const submitSent = async (
  row: QueuedRecording,
  blob: Blob,
  link: UploadUrl,
): Promise<SendResult> => {
  try {
    await submit(link.submissionId, row);

    return await sentFrom(row, link.submissionId, false);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'precheck_failed') {
      const { submissionId } = (error.details ?? {}) as { submissionId?: string };

      return sentFrom(row, submissionId ?? link.submissionId, true);
    }

    if (!(error instanceof ApiError) || error.code !== 'video_not_uploaded') {
      throw error;
    }

    return resubmit(row, blob, link);
  }
};

const resubmit = async (row: QueuedRecording, blob: Blob, link: UploadUrl): Promise<SendResult> => {
  const fresh = await upload(row, blob, await requestLink(row));

  if (fresh === null) {
    return { type: 'failed', failure: { type: 'video-not-uploaded' } };
  }

  try {
    await submit(link.submissionId, row);

    return await sentFrom(row, link.submissionId, false);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'video_not_uploaded') {
      return { type: 'failed', failure: { type: 'video-not-uploaded' } };
    }

    throw error;
  }
};

/** Upload-url → PUT → submit for one queued recording. Resolves with the outcome; rethrows only a navigation error. */
export const sendRecording = async (row: QueuedRecording, blob: Blob): Promise<SendResult> => {
  try {
    const first = await requestLink(row);

    await setSubmissionId(row, first.submissionId);

    const link = await upload(row, blob, first);

    if (link === null) {
      return { type: 'failed', failure: UPLOAD_FAILED };
    }

    return await submitSent(row, blob, link);
  } catch (error) {
    return { type: 'failed', failure: failureOf(error) };
  }
};
