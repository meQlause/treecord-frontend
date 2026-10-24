// D02 "Register this device" and D03 "Revoke this device" (s22-device.md §3, §6). Register makes the key pair, sends only the
// public half, and writes the record after a 201 — so a refusal or a failure never leaves a key behind. Revoke deletes the
// device on the server, then the key here. One request at a time; the screen shows the outcome, never a half-done state.
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useToast } from '../../app/shell/toast-context';
import { deleteKeyRecord, generateDeviceKey, writeKeyRecord } from '../evidence/device-key';
import { useRegisterDevice, useRevokeDevice } from './device.api';
import { DEFAULT_LABEL, NO_KEY, REGISTERED, REVOKED, type ErrorKey } from './device.copy';
import { registerFailure, revokeTargetGone } from './device.rules';

const DEVICE_KEY = ['device'];

export function useDeviceActions(profileId: string) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const registering = useRegisterDevice();
  const revoking = useRevokeDevice();
  const [label, setLabel] = useState(DEFAULT_LABEL);
  const [failure, setFailure] = useState<ErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [revokeFailed, setRevokeFailed] = useState(false);

  const refreshDevices = (): Promise<void> =>
    queryClient.invalidateQueries({ predicate: ({ queryKey }) => queryKey.includes('devices') });

  const refresh = async (): Promise<void> => {
    await refreshDevices();
    await queryClient.invalidateQueries({ queryKey: DEVICE_KEY });
  };

  /** Makes the key, registers its public half, and keeps the record only once the server accepted it. */
  const enroll = async (): Promise<void> => {
    const generated = await generateDeviceKey().catch(() => null);

    if (generated === null) {
      throw new Error(NO_KEY);
    }

    const device = await registering.mutateAsync({
      publicKeyJwk: generated.publicJwk,
      label: label.trim(),
    });

    // the list first: a key the list does not hold yet would be taken for a revoked one and deleted
    await refreshDevices();
    await writeKeyRecord(profileId, {
      ...generated,
      thumbprint: device.thumbprint,
      deviceId: device.id,
      label: device.label,
      createdAt: device.createdAt,
    });
    await queryClient.invalidateQueries({ queryKey: DEVICE_KEY });
  };

  const register = async (): Promise<void> => {
    setBusy(true);
    setFailure(null);

    try {
      await enroll();
      notify(REGISTERED);
    } catch (error) {
      const key =
        error instanceof Error && error.message === NO_KEY ? 'NO_KEY' : registerFailure(error);

      setFailure(key);

      if (key === 'NO_KEY') {
        notify(NO_KEY, true);
      }
    } finally {
      setBusy(false);
    }
  };

  /** Resolves false (the review stays open, the key is kept) when the server could not be reached. */
  const revoke = async (deviceId: string): Promise<boolean> => {
    setRevokeFailed(false);

    try {
      await revoking.mutateAsync(deviceId);
    } catch (error) {
      if (!revokeTargetGone(error)) {
        setRevokeFailed(true);

        return false;
      }
    }

    await deleteKeyRecord(profileId);
    await refresh();
    notify(REVOKED);

    return true;
  };

  return { label, setLabel, failure, busy, register, revoke, revokeFailed };
}
