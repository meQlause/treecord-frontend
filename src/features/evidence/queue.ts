// The offline queue of recordings (s19-record.md §1, s20-uploads.md). A row is persisted before any network call, so a tab
// that dies mid-upload loses nothing; it lives until its submit answers (202 or 422) or the planter discards it. Every
// row carries its profile id and is never read under another (FR-106). The clip Blob sits beside it in `clips`.
import { CLIPS, QUEUE, inStore } from './device-db';
import type { CapturePayload, CaptureKind } from './evidence.rules';

export type QueuedRecording = {
  id: string;
  profileId: string;
  submissionId: string | null;
  kind: CaptureKind;
  campaign: { address: string; title: string; regionName?: string };
  slotId: string | null;
  treeId: string | null;
  milestone: number;
  month: number | null;
  durationSec: number;
  sizeBytes: number;
  contentType: string;
  capturedAt: string;
  payload: CapturePayload;
  canonical: string;
  signature: string;
};

/** How many queued recordings of `profileId` were signed with the key `thumbprint`; 0 when storage is blocked. */
export const countQueuedFor = async (profileId: string, thumbprint: string): Promise<number> => {
  try {
    const rows = (await inStore(QUEUE, 'readonly', (store) => store.getAll())) as Pick<
      QueuedRecording,
      'profileId' | 'payload'
    >[];

    return rows.filter((row) => row.profileId === profileId && row.payload.deviceKey === thumbprint)
      .length;
  } catch {
    return 0;
  }
};

/** Clip first, then the row: a clip without a row is harmless, a row without a clip is a promise we cannot keep. */
export const queueRecording = async (row: QueuedRecording, blob: Blob): Promise<void> => {
  await inStore(CLIPS, 'readwrite', (store) => store.put(blob, row.id));
  await inStore(QUEUE, 'readwrite', (store) => store.put(row, row.id));
};

/** `submissionId` is stored before the PUT, so a retry reuses it. */
export const setSubmissionId = (row: QueuedRecording, submissionId: string): Promise<IDBValidKey> =>
  inStore(QUEUE, 'readwrite', (store) => store.put({ ...row, submissionId }, row.id));

/** The submit answered: the row goes, the clip is re-keyed to the submission so S21 can play it (FR-114). */
export const finishRecording = async (
  row: QueuedRecording,
  submissionId: string,
): Promise<void> => {
  const clip = (await inStore(CLIPS, 'readonly', (store) => store.get(row.id))) as Blob | undefined;

  if (clip !== undefined) {
    await inStore(CLIPS, 'readwrite', (store) => store.put(clip, submissionId));
  }

  await inStore(CLIPS, 'readwrite', (store) => store.delete(row.id));
  await inStore(QUEUE, 'readwrite', (store) => store.delete(row.id));
};

/** The queued recordings of `profileId`, newest capture first; `[]` when storage is blocked. */
export const listQueued = async (profileId: string): Promise<QueuedRecording[]> => {
  try {
    const rows = (await inStore(QUEUE, 'readonly', (store) => store.getAll())) as QueuedRecording[];

    return rows
      .filter((row) => row.profileId === profileId)
      .sort((first, second) => second.capturedAt.localeCompare(first.capturedAt));
  } catch {
    return [];
  }
};

/** The original bytes of a queued recording, or `undefined` when the clip is gone from this device. */
export const readClip = async (id: string): Promise<Blob | undefined> =>
  (await inStore(CLIPS, 'readonly', (store) => store.get(id))) as Blob | undefined;

/** "Discard": the row and its clip leave this device; nothing is sent (FR-111). */
export const discardRecording = async (id: string): Promise<void> => {
  await inStore(CLIPS, 'readwrite', (store) => store.delete(id));
  await inStore(QUEUE, 'readwrite', (store) => store.delete(id));
};
