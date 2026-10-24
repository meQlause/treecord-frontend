// What S20 does with the recordings on this phone (s20-uploads.md §1, §2.2, §6): reads the queue of the signed-in profile,
// sends one card at a time, and discards one after its confirmation. Each action re-reads the queue; a send that answered
// also re-asks the server list, where the card reappears with its real status.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { discardRecording, listQueued, type QueuedRecording } from '../evidence/queue';
import { UPLOAD_FAILED, sendQueued, type SendFailure } from './record.api';

const QUEUE_KEY = ['device', 'queue-rows'];

/** The queued recordings of `profileId`, newest first. */
export const useLocalQueue = (profileId: string) =>
  useQuery({ queryKey: [...QUEUE_KEY, profileId], queryFn: () => listQueued(profileId) });

type Failures = Readonly<Record<string, SendFailure>>;

export function useQueueActions() {
  const queryClient = useQueryClient();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [failures, setFailures] = useState<Failures>({});
  const send = useMutation({ mutationFn: (row: QueuedRecording) => sendQueued(row) });

  const settle = (id: string, failure: SendFailure | null): void => {
    setFailures(({ [id]: _gone, ...rest }) =>
      failure === null ? rest : { ...rest, [id]: failure },
    );
    void queryClient.invalidateQueries({ queryKey: QUEUE_KEY });

    if (failure === null) {
      void queryClient.invalidateQueries({ queryKey: ['planter', 'uploads'] });
    }
  };

  const upload = async (row: QueuedRecording): Promise<void> => {
    setSendingId(row.id);

    try {
      const result = await send.mutateAsync(row);

      settle(row.id, result.type === 'failed' ? result.failure : null);
    } catch {
      // a refused token already sent the person to S02 (the mutation cache)
      settle(row.id, UPLOAD_FAILED);
    } finally {
      setSendingId(null);
    }
  };

  const discard = async (id: string): Promise<void> => {
    await discardRecording(id);
    setConfirmingId(null);
    void queryClient.invalidateQueries({ queryKey: QUEUE_KEY });
  };

  return { sendingId, confirmingId, failures, upload, discard, confirm: setConfirmingId };
}
