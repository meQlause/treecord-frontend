// The pure rules of S06 (s06-report.md §2 "Formatting", §4 Validation): what the figures say, from the numbers the API sent.
import {
  EVENT_CHECK_IN_NO_MONTH,
  EVENT_DIED,
  EVENT_PLANTED,
  EVENT_REPLANTED,
  checkIn,
  type Message,
} from './report.copy';

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

const BPS = 10_000;
const PERCENT = 100;

/** `active` → "Active": the badge shows the status as the mockup spells it. */
export const statusLabel = (status: string): string =>
  status.charAt(0).toUpperCase() + status.slice(1);

/** s06 §4: `:address` is checked before the request. */
export const isAddress = (value: string): boolean => ADDRESS.test(value);

/** The six months a milestone can fall on, left to right. */
export const MILESTONE_MONTHS: readonly number[] = '0,3,6,12,24,36'.split(',').map(Number);

/** Survival as a percentage with one decimal (`9654` → 96.5), `null` before anything is planted. */
export const survivalPercent = (bps: number | null): number | null =>
  bps === null ? null : Number((bps / PERCENT).toFixed(1));

/** Basis points as a whole percent, capped at 100 and `null` read as 0 (the funding bar, the payout gauge). */
export const wholePercent = (bps: number | null): number =>
  Math.min(PERCENT, Math.round((bps ?? 0) / PERCENT));

/** Basis points as a 0–1 share, capped at 1. */
export const share = (bps: number | null): number => Math.min(1, (bps ?? 0) / BPS);

/** Trees planted over the target, 0–1 (a target of 0 reads as nothing planted). */
export const plantedShare = (planted: number, target: number): number =>
  target > 0 ? Math.min(1, planted / target) : 0;

const FIXED_LABELS: Readonly<Record<string, Message>> = {
  planted: EVENT_PLANTED,
  died: EVENT_DIED,
  replanted: EVENT_REPLANTED,
};

/** E-7: the event label of a row; a check-in without a matched submission has no month. */
export const eventLabel = (kind: string, month: number | null): Message => {
  if (kind === 'check_in') {
    return month === null ? EVENT_CHECK_IN_NO_MONTH : checkIn(month);
  }

  return FIXED_LABELS[kind] ?? kind.replaceAll('_', ' ');
};

/** The legend's order: alive, flagged, dead, removed, completed (`HEALTH` in the forest). */
export const healthCounts = (trees: {
  alive: number;
  flagged: number;
  dead: number;
  removed: number;
  completed: number;
}): number[] => [trees.alive, trees.flagged, trees.dead, trees.removed, trees.completed];
