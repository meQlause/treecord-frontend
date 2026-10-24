// docs/BE/features/evidence.md §1-§3: the bodies the S19 spec answers with — the capture-target of tree 3001 (ALIVE,
// month 6, allowed), the blocked target of tree 3104, the upload link and the submit answers.
import type { Json } from './campaigns';

export const ROOTS = '0x0000000000000000000000000000000000000003';

export const TAG = 'TC-K7QM-3XRA';

export const SUBMISSION = '7d5c9b8e-1f4a-4c2e-9a3b-6f0e2d1c4b5a';

export const REJECTED_SUBMISSION = 'a4d7e2c9-81b3-4f6e-b05a-3c9d1e7f2a64';

export const HELD = '5c1e9a7d-3b2f-4e80-9d6a-0f7b2c4e8a13';

export const FIX = { latitude: -7.42431, longitude: 109.23987, accuracy: 8.4 };

/** `GET /evidence/capture-target?kind=ALIVE&treeId=3001`, allowed. */
export const TARGET_3001: Json = {
  kind: 'ALIVE',
  slotId: null,
  treeId: '3001',
  milestone: 2,
  month: 6,
  campaign: {
    address: ROOTS,
    title: 'Roots that stay',
    regionName: 'Banyumas, Central Java',
    regionRadiusM: 2500,
  },
  tag: TAG,
  challenge: { code: 'R4M9', qr: 'TCH-R4M9', expiresAt: '2026-12-20T04:00:00.000Z' },
  reference: { kind: 'tree', lat: -7.42431, lon: 109.23987, radiusM: 15 },
  allowed: true,
  reasons: [],
  held: null,
  chainTime: '2026-10-23T09:12:31.000Z',
};

/** Tree 3104: the month-6 check-in is already with the reviewers. */
export const TARGET_3104_HELD: Json = {
  ...TARGET_3001,
  treeId: '3104',
  allowed: false,
  reasons: ['milestone_already_done'],
  held: { id: HELD, status: 'needs_review' },
};

export const TARGET_NO_TAG: Json = {
  ...TARGET_3001,
  allowed: false,
  reasons: ['tag_missing'],
  tag: null,
};

/** `POST /evidence/upload-url` 201: the presigned PUT of the clip. */
export const UPLOAD_201: Json = {
  submissionId: SUBMISSION,
  status: 'queued',
  upload: {
    method: 'PUT',
    url: 'http://localhost:9000/evidence/b6e3d9a1/7d5c9b8e.webm?X-Amz-Signature=sig',
    headers: {
      'Content-Type': 'video/webm',
      'x-amz-checksum-sha256': 'nyxBqwfeWMPhtG8qnXwD5bihT20sngezpfgdTG4r5Bo=',
    },
    expiresAt: '2026-10-23T09:30:20.144Z',
  },
};

export const SUBMIT_202: Json = { submissionId: SUBMISSION, status: 'checking' };

/** The error envelope of a refusal. */
export const refusal = (code: string, details?: Json): Json => ({
  error: { code, message: code, ...(details === undefined ? {} : { details }) },
});
