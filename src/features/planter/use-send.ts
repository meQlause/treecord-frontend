// S19's two ways out of review (s19-record.md §6): "Upload now" persists the row and clip, then upload-url → PUT → submit
// and opens S21 with the toast the answer earns; "Save offline" persists and opens S20. A failure stays in review, with the
// recording queued.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useNavigate } from 'react-router';
import { useToast } from '../../app/shell/toast-context';
import { queueRecording, type QueuedRecording } from '../evidence/queue';
import type { Clip } from '../evidence/use-capture';
import { UPLOAD_FAILED, sendRecording, type CaptureTarget, type SendFailure } from './record.api';
import * as copy from './record.copy';
import { rowOf } from './record.rules';

const UPLOADS = '/app/planter/uploads';

/** A send that answered with a failure: unwinds `run` to the one place that shows it. */
class SendStopped extends Error {
  constructor(readonly failure: SendFailure) {
    super(failure.type);
  }
}

export function useSend(profileId: string, target: CaptureTarget, clip: Clip | null) {
  const [running, setRunning] = useState(false);
  const [failure, setFailure] = useState<SendFailure | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const send = useMutation({
    mutationFn: ({ row, blob }: { row: QueuedRecording; blob: Blob }) => sendRecording(row, blob),
  });

  const saveOffline = async (): Promise<void> => {
    if (clip !== null) {
      await queueRecording(rowOf(profileId, target, clip), clip.blob);
      notify(copy.savedOffline);
      void navigate(UPLOADS);
    }
  };

  /** Queue, send, then leave for S21; a failure stays in review. */
  const run = async (clipped: Clip): Promise<void> => {
    const row = rowOf(profileId, target, clipped);

    await queueRecording(row, clipped.blob);

    const result = await send.mutateAsync({ row, blob: clipped.blob });

    if (result.type === 'failed') {
      throw new SendStopped(result.failure);
    }

    void queryClient.invalidateQueries({ queryKey: ['planter'] });
    notify(result.rejected ? copy.PRECHECKS_REJECTED : copy.PRECHECKS_PASSED, result.rejected);
    void navigate(`/app/evidence/${result.submissionId}`);
  };

  const upload = async (): Promise<void> => {
    if (clip === null) {
      return;
    }

    setRunning(true);
    setFailure(null);

    try {
      await run(clip);
    } catch (error) {
      // a refused token already sent the person to S02 (the mutation cache); anything else is a failed upload
      setFailure(error instanceof SendStopped ? error.failure : UPLOAD_FAILED);
      setRunning(false);
    }
  };

  return {
    running,
    failure,
    upload,
    saveOffline,
    reset: () => {
      setRunning(false);
      setFailure(null);
    },
  };
}
