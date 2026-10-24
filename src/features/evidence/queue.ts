// The offline queue of recordings (s19-record.md, s20-uploads.md). S22 only counts what this phone's key signed, to warn
// before a revoke (devices.md §3 trap: those recordings would be rejected afterwards). A row is `{ profileId, payload }`
// and `payload.deviceKey` is the thumbprint of the key that signed it.
import { QUEUE, inStore } from './device-db';

type QueuedRow = { profileId?: string; payload?: { deviceKey?: string } };

/** How many queued recordings of `profileId` were signed with the key `thumbprint`; 0 when storage is blocked. */
export const countQueuedFor = async (profileId: string, thumbprint: string): Promise<number> => {
  try {
    const rows = (await inStore(QUEUE, 'readonly', (store) => store.getAll())) as QueuedRow[];

    return rows.filter(
      (row) => row.profileId === profileId && row.payload?.deviceKey === thumbprint,
    ).length;
  } catch {
    return 0;
  }
};
