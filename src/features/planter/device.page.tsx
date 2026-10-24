// S22 This device (s22-device.md): whether this browser holds a signing key the server accepts, and the two actions on it —
// D02 register this device, D03 revoke it. No list of other devices (FR-119). It lives in the workspace frame, so offline the
// shell's callout and disabled fieldset wrap it, and "Register" and "Revoke" are off.
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../app/session/session';
import { ERROR_BODY, ERROR_TITLE, LOADING } from '../../app/states/states.copy';
import { KeyArt } from '../../shared/art/KeyArt';
import { Banner } from '../../shared/ui/Banner';
import { PageHead } from '../../shared/ui/PageHead';
import { Skeleton } from '../../shared/ui/Skeleton';
import { deleteKeyRecord } from '../evidence/device-key';
import { useDeviceActions } from './device.actions';
import { useActiveDevices } from './device.api';
import { DEVICE_COORD, DEVICE_EM, DEVICE_EYEBROW, DEVICE_LINE } from './device.copy';
import { ProofPanel, SigningPanel } from './device.parts';
import { keyState } from './device.rules';
import { useKeyRecord, useQueuedFor } from './device.store';
import { TRY_AGAIN } from './planter.copy';

/** A key the server no longer lists can never sign again (a revoked key cannot re-register): delete it, then follow the list. */
function useForgetStale(profileId: string, stale: boolean): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (stale) {
      void deleteKeyRecord(profileId).then(() =>
        queryClient.invalidateQueries({ queryKey: ['device'] }),
      );
    }
  }, [stale, profileId, queryClient]);
}

function Device({ profileId }: { profileId: string }) {
  const record = useKeyRecord(profileId);
  const devices = useActiveDevices();
  const actions = useDeviceActions(profileId);
  const state = keyState(record.data, devices.data);
  const local = state === 'ready' ? (record.data ?? null) : null;
  const queued = useQueuedFor(profileId, local?.thumbprint);

  useForgetStale(profileId, state === 'stale');

  if (record.data === undefined || (devices.isPending && !devices.isError)) {
    return <Skeleton shape="page" label={LOADING} />;
  }

  return (
    <>
      <PageHead
        className="pl-heading"
        eyebrow={DEVICE_EYEBROW}
        title={DEVICE_LINE}
        em={DEVICE_EM}
        art={<KeyArt />}
        coord={DEVICE_COORD}
      />
      {devices.isError && (
        <Banner tone="error" action={TRY_AGAIN} onAction={() => void devices.refetch()}>
          <strong>{ERROR_TITLE}</strong> {ERROR_BODY}
        </Banner>
      )}
      <div className="ws-columns pf-columns pl-device">
        <SigningPanel
          record={local}
          lost={state === 'missing'}
          register={{
            label: actions.label,
            failure: actions.failure,
            busy: actions.busy,
            onLabel: actions.setLabel,
            onRegister: () => void actions.register(),
          }}
          revoke={{
            queued,
            failed: actions.revokeFailed,
            onRevoke: () => actions.revoke(local?.deviceId ?? ''),
          }}
        />
        <ProofPanel ready={local !== null} />
      </div>
    </>
  );
}

export function Component() {
  const session = useSession();

  return session.phase === 'ready' ? <Device profileId={session.profile.id} /> : null;
}
