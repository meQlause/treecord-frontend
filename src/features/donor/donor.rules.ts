// S13's pure rules (s13-donor-home.md §2 "Formatting", §4). No React here. Amounts are decimal strings (REG-001).
import { ApiError } from '../../shared/api/errors';
import { tonnes } from '../../shared/format/carbon';
import { number } from '../../shared/format/number';
import type { DonorCard, TreeCounts } from './donor.api';
import { CARBON_LABELS, NO_VALUE, TABS, UNIT } from './donor.copy';

const BPS_PER_PERCENT = 100;
const SHARE_DIGITS = 2;
const SURVIVAL_DIGITS = 1;
const TREES_PER_GLYPH = 40;
const NONE = BigInt(0);

type Tab = (typeof TABS)[number];

/** An unknown `?status=` is "All" and sends no status (§4). */
export const parseTab = (raw: string | null): Tab => TABS.find((tab) => tab === raw) ?? 'All';

/** The API's `status` for a tab: lower case, none for "All". */
export const statusOf = (tab: Tab): string | undefined =>
  tab === 'All' ? undefined : tab.toLowerCase();

/** "3.65": the donor's share of the campaign's funding; `null` is "—" (FR-073). */
export const shareText = (bps: number | null): string =>
  bps === null ? NO_VALUE : (bps / BPS_PER_PERCENT).toFixed(SHARE_DIGITS);

/** 96.9: survival in percent with one decimal, or `null` while nothing is planted. */
export const survivalPercent = (bps: number | null): number | null =>
  bps === null ? null : Number((bps / BPS_PER_PERCENT).toFixed(SURVIVAL_DIGITS));

/** The whole percent of its target a campaign has raised. */
export const fundedPercent = (progressBps: number): number =>
  Math.round(progressBps / BPS_PER_PERCENT);

/** The share of the trees planted, 0 to 1, for the funding row. */
export const plantedShare = ({ planted }: TreeCounts, treeTarget: number): number =>
  treeTarget === 0 ? 0 : Math.min(1, planted / treeTarget);

/** Tree counts in the order of `HEALTH`: alive, flagged, dead, removed, completed. */
export const healthCounts = ({
  alive,
  flagged,
  dead,
  removed,
  completed,
}: TreeCounts): number[] => [alive, flagged, dead, removed, completed];

/** "25": each glyph of the forest stands for this many trees. */
export const treesPerGlyph = (planted: number): string =>
  number(Math.round(planted / TREES_PER_GLYPH));

/** The four carbon stages, widest first; `null` where the stage has nothing (no estimate, no reservation). */
const carbonAmounts = ({ carbon }: DonorCard): (number | null)[] => [
  carbon.campaignEstimate === null ? null : Number(carbon.campaignEstimate.estimatedAmount),
  carbon.reservation === null ? null : Number(carbon.reservation.reservedAmount),
  carbon.reservation === null ? null : Number(carbon.reservation.allocatedAmount),
  Number(carbon.issuedHoldings.issuedAmount),
];

/** "8.005 tCO₂e", or "—" for a stage with nothing. */
export const carbonText = (units: number | null): string =>
  units === null ? NO_VALUE : `${tonnes(String(units))} ${UNIT}`;

/** The card has no carbon at all: no estimate, no reservation, nothing issued (FR-073 #2). */
export const hasNoCarbon = ({ carbon }: DonorCard): boolean =>
  carbon.campaignEstimate === null &&
  carbon.reservation === null &&
  BigInt(carbon.issuedHoldings.issuedAmount) === NONE;

/** The funnel's rows: label and amount per stage. */
export const carbonRows = (card: DonorCard): [string, number | null][] =>
  CARBON_LABELS.map((label, index): [string, number | null] => [
    label,
    carbonAmounts(card)[index] ?? null,
  ]);

/** The error code of a failed read; a failure with no envelope (no network, a timeout) is "network". */
const codeOf = (error: unknown): string | null => {
  if (error === null) {
    return null;
  }

  return error instanceof ApiError ? error.code : 'network';
};

/** What a read says about itself, for `homeView`: pending, the error code of a failure (any other failure is "network"). */
type Read = { pending: boolean; code: string | null; hasData: boolean; paused: boolean };

export const readOf = (query: {
  isPending: boolean;
  error: unknown;
  data: unknown;
  fetchStatus: string;
}): Read => ({
  pending: query.isPending,
  code: codeOf(query.error),
  hasData: query.data !== undefined,
  paused: query.fetchStatus === 'paused',
});

export type HomeView = 'loading' | 'wallet' | 'error' | 'empty' | 'ready';

/**
 * Which of s13 §3's page states to draw from the two reads. A wallet still being made beats everything (S-8); a failure
 * with nothing cached, or offline with nothing cached, is S-2; a failed later page keeps the cards (S-14).
 */
export const homeView = (reads: readonly Read[], campaigns: number | undefined): HomeView => {
  if (reads.some(({ code }) => code === 'wallet_missing')) {
    return 'wallet';
  }

  if (
    reads.some((read) => (read.code !== null && !read.hasData) || (read.pending && read.paused))
  ) {
    return 'error';
  }

  if (reads.some(({ pending }) => pending)) {
    return 'loading';
  }

  return campaigns === 0 ? 'empty' : 'ready';
};
