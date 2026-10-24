// The AI policy's lines, for display only (s21-evidence.md §1): the pass line of a gauge and the colour of its band. The
// decision S21 shows is always the server's `policyDecision`; nothing here decides anything.
export type Limits = { reject: number; review: number };

export const POLICY_THRESHOLDS = {
  liveness: { reject: 0.7, review: 0.8 },
  treePresence: { reject: 0.7, review: 0.8 },
  growthConsistency: { reject: 0.5, review: 0.6 },
  challengeVisible: { reject: 0.8, review: 0.9 },
  recapture: { reject: 0.3, review: 0.2 },
  duplicate: { reject: 0.9, review: 0.8 },
} as const satisfies Record<string, Limits>;

/** The tag is read or it is not: 1 against 1. */
export const TAG_LIMITS: Limits = { reject: 1, review: 1 };
