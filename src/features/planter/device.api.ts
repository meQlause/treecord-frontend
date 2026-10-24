// docs/BE/features/devices.md §1-§3 as S22 calls them: the active devices, register this browser's public key, revoke one.
// Private: the keys follow the account (NFR-051). The key itself never travels: only the four public JWK members do.
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../app/session/api';
import { useAccountKey } from '../../app/session/use-account-key';
import type { PublicJwk } from '../evidence/device-key';

export type ActiveDevice = { id: string; thumbprint: string; label: string; createdAt: string };

/** `GET /devices`: the planter's active devices, never more than three (devices.md §1). */
export const useActiveDevices = () => {
  const { ready, key } = useAccountKey();

  return useQuery({
    queryKey: [...key, 'devices'],
    queryFn: ({ signal }) => api<{ items: ActiveDevice[] }>('/devices', { signal }),
    select: ({ items }) => items,
    enabled: ready,
  });
};

type Registration = { publicKeyJwk: PublicJwk; label: string };

/** `POST /devices`: 201 with the device the server made; any refusal is thrown as an `ApiError`. */
export const useRegisterDevice = () =>
  useMutation({
    mutationFn: (body: Registration) =>
      api<{ device: ActiveDevice }>('/devices', { method: 'POST', body }).then(
        ({ device }) => device,
      ),
  });

/** `DELETE /devices/:id`: 200 whether or not it was already revoked (idempotent). */
export const useRevokeDevice = () =>
  useMutation({ mutationFn: (id: string) => api<unknown>(`/devices/${id}`, { method: 'DELETE' }) });
