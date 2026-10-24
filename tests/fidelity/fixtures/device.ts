// docs/BE/features/devices.md §1-§2: Sari's one registered browser, the bodies the S22 spec answers with.
import type { Json } from './campaigns';

export const DEVICE_ID = 'c2a9f4e1-6b3d-4a7f-9e08-1d5b7c3a2f96';

export const THUMBPRINT = 'x3Jd9kQpT2aBvR7mN4cY8wLs1eFhGz6uK0oPiXjVbQs';

export const DEVICE: Json = {
  id: DEVICE_ID,
  thumbprint: THUMBPRINT,
  label: 'Pixel 8',
  createdAt: '2026-10-23T03:20:15.067Z',
  revokedAt: null,
};

/** A `GET /devices` answer: the active devices, no cursor. */
export const devicesOf = (items: Json[]): Json => ({
  items,
  nextCursor: null,
  total: items.length,
});

/** A `POST /devices` 201 answer. */
export const registered = (changes: Json = {}): Json => ({ device: { ...DEVICE, ...changes } });
