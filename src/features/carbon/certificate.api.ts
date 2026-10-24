// docs/BE/features/carbon.md §5 as S09 reads it: one retirement with its batch and campaign. Public: the endpoint
// ignores a token and none is sent, so the key holds no account (s09-certificate.md §1).
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../../app/session/api';

export type RegistryStatus = 'pending' | 'done';

export type Retirement = {
  retirementId: string;
  amount: string;
  beneficiary: string;
  purpose: string | null;
  retiredAt: string;
  holder: string;
  txHash: string;
  registryRetirement: { status: RegistryStatus; reference: string | null };
  batch: {
    batchId: string;
    registry: string;
    vintage: number;
    serialStart: string;
    serialEnd: string;
    issuedAmount: string;
    issuedTx: { hash: string; url: string | null } | null;
  };
  campaign: {
    address: string;
    title: string;
    region: { name: string; geohash: string };
    species: { code: string; name: string };
    treeTarget: number;
  };
};

// the registry status can change (FR-240), so a record is not trusted for long
const STALE_MS = 30_000;

export const useRetirement = (retirementId: string) =>
  useQuery({
    queryKey: ['carbon', 'retirement', retirementId],
    queryFn: ({ signal }) =>
      publicApi<Retirement>(`/carbon/retirements/${retirementId}`, { signal }),
    staleTime: STALE_MS,
  });
