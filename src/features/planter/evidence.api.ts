// `GET /evidence/:id` as S21 reads it (s21-evidence.md §2.1, evidence.md §4): one submission as the server holds it, polled
// while it moves; the local clip of the owner's phone; "Record again" eligibility. The page renders the server's decision and
// never re-evaluates a score or a precheck (FR-116).
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../../app/session/api';
import { useAccountKey } from '../../app/session/use-account-key';
import type { CapturePayload, CaptureKind } from '../evidence/evidence.rules';
import { readClip } from '../evidence/queue';
import { usePace } from './use-pace';

export type PrecheckRow = {
  check: string;
  ok: boolean | null;
  value: string | null;
  reason: string | null;
};

export type AiScores = {
  liveness: number | null;
  recapture: number | null;
  treePresence: number | null;
  growthConsistency: number | null;
  duplicate: { maxSimilarity: number | null } | null;
  challengeVisible: number | null;
  tagDecoded: string | null;
};

export type Evidence = {
  id: string;
  kind: CaptureKind;
  status: string;
  campaign: { address: string; regionRadiusM?: number };
  slotId: string | null;
  treeId: string | null;
  month: number | null;
  capturedAt: string;
  durationSec: number;
  videoSha256: string | null;
  payload: CapturePayload | null;
  canonical: string | null;
  signature: string | null;
  precheckResults: PrecheckRow[];
  rejectReasons: string[];
  policyDecision: string | null;
  policyScore: number | null;
  ai: { modelVersion: string; scores: AiScores } | null;
  keyframes: { urls: string[]; expiresAt: string } | null;
  challenge: { code: string } | null;
  review: { note: string | null; decision: 'approved' | 'rejected' } | null;
  pipeline: { step: number; failedAt: 'prechecks' | 'scored' | 'attested' | null };
  error?: string;
};

/** Statuses the server still moves along; `queued` moves only when the recording device sends it. */
const MOVING = new Set(['checking', 'scored', 'passed', 'needs_review', 'attested']);

const FRESH_BEFORE_MS = 30_000;

/**
 * The submission, polled 2 s → 5 s while it moves (NFR-063). A failed poll keeps the last data. The keyframe links expire
 * after 15 minutes, so the query is asked once more 30 s before `keyframes.expiresAt`, moving or not.
 */
export const useEvidence = (id: string) => {
  const { ready, key } = useAccountKey();
  const pace = usePace();
  const query = useQuery({
    queryKey: ['evidence', ...key, id],
    queryFn: ({ signal }) => api<Evidence>(`/evidence/${id}`, { signal }),
    enabled: ready,
    refetchInterval: ({ state }) => pace(state.data, MOVING.has(state.data?.status ?? '')),
  });
  const { refetch } = query;
  const expiresAt = query.data?.keyframes?.expiresAt;

  useEffect(() => {
    if (expiresAt === undefined) {
      return undefined;
    }

    const timer = setTimeout(
      () => void refetch(),
      Math.max(0, Date.parse(expiresAt) - Date.now() - FRESH_BEFORE_MS),
    );

    return () => clearTimeout(timer);
  }, [expiresAt, refetch]);

  return query;
};

/** An object URL of the clip this phone still holds for submission `id`; `null` when none (or not asked for). */
export const useLocalClip = (id: string, enabled: boolean): string | null => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let made: string | null = null;
    let live = true;

    void readClip(id)
      .then((blob) => {
        if (live && blob !== undefined) {
          made = URL.createObjectURL(blob);
          setUrl(made);
        }
      })
      .catch(() => undefined);

    return () => {
      live = false;

      if (made !== null) {
        URL.revokeObjectURL(made);
      }
    };
  }, [id, enabled]);

  return url;
};
