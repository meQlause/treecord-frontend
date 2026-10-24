// This phone's key record as the planter screens read it: S16 only needs the device id ("submitted from this phone", FR-082),
// S22 the whole record and the queue count. The record itself belongs to the evidence feature (device-key.ts).
import { useQuery } from '@tanstack/react-query';
import { readKeyRecord } from '../evidence/device-key';
import { countQueuedFor } from '../evidence/queue';

/** The device id this phone registered for `profileId`, or `null` when it never did. */
export const useLocalDeviceId = (profileId: string | undefined) =>
  useQuery({
    queryKey: ['device', 'id', profileId],
    queryFn: async () => (await readKeyRecord(profileId ?? ''))?.deviceId ?? null,
    enabled: profileId !== undefined,
    staleTime: Infinity,
  }).data ?? null;

/** The key record of `profileId` as a query: `undefined` while it is being read, `null` when this browser holds none. */
export const useKeyRecord = (profileId: string) =>
  useQuery({
    queryKey: ['device', 'key', profileId],
    queryFn: () => readKeyRecord(profileId),
    staleTime: Infinity,
  });

/** How many queued recordings this key signed: the D03 warning (devices.md §3 trap). */
export const useQueuedFor = (profileId: string, thumbprint: string | undefined) =>
  useQuery({
    queryKey: ['device', 'queued', profileId, thumbprint],
    queryFn: () => countQueuedFor(profileId, thumbprint ?? ''),
    enabled: thumbprint !== undefined,
  }).data ?? 0;
