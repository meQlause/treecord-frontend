// This phone's key record (s22-device.md): one per profile in IndexedDB, `treecord` / `keys`. S16 reads only the device id
// from it, to say a check-in was "submitted from this phone" (FR-082); S22 writes the whole record when the phone is
// registered. Every access is guarded: a blocked store means no device id, never a failure.
import { useQuery } from '@tanstack/react-query';

const DATABASE = 'treecord';
const VERSION = 1;
const STORE = 'keys';

type KeyRecord = { deviceId?: string };

const openKeys = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);

    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** The device id this phone registered for `profileId`, or `null` when it never did (or storage is blocked). */
const readDeviceId = async (profileId: string): Promise<string | null> => {
  try {
    const database = await openKeys();

    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE).objectStore(STORE).get(profileId);

      request.onsuccess = () =>
        resolve((request.result as KeyRecord | undefined)?.deviceId ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
};

/** `readDeviceId` as a query, so a page reads it once and re-renders when it lands. */
export const useLocalDeviceId = (profileId: string | undefined) =>
  useQuery({
    queryKey: ['device', 'id', profileId],
    queryFn: () => readDeviceId(profileId ?? ''),
    enabled: profileId !== undefined,
    staleTime: Infinity,
  }).data ?? null;
