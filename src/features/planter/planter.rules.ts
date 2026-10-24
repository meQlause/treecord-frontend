// S16's pure rules (s16-my-trees.md §2 "Derived display rules"): a mirror of FR-082 and FR-083 over the fields the server
// sends. The page never decides eligibility; it maps the server's `capture` block to a label and a link. No React here.
import type { IconName } from '../../shared/art/Icon';
import type { MilestoneStatus } from '../../shared/art/TreeCardArt';
import { localDate } from '../../shared/format/datetime';
import { usdc } from '../../shared/format/money';
import type { PlanterSlot, PlanterTree, TreeMilestone, TreeStatus, TreesPage } from './planter.api';
import {
  ALL_PAID,
  ALL_SETTLED,
  NO_DATE,
  NO_MORE_PAYOUTS,
  PAUSED_META,
  PAUSED_UNTIL,
  RECORD_CHECK_IN,
  RECORD_REPLANT,
  SETTLED,
  STATUS_LABEL,
  TREE_FILTERS,
  VIEW_TREE,
  checkInHeld,
  monthLabel,
  nextPayout,
  nextWindow,
  pausedAt,
  replantBy,
  submitted,
  submittedHere,
  windowOpenUntil,
} from './planter.copy';

const PERCENT = 100;
const STATUSES = Object.keys(STATUS_LABEL) as TreeStatus[];

type Filter = (typeof TREE_FILTERS)[number];

/** An unknown `?status=` is dropped before any request (§4): the client never sends a 400. */
export const parseStatus = (raw: string | null): TreeStatus | undefined =>
  STATUSES.find((status) => status === raw);

/** The filter button a status lights: "Alive" for `alive`, "All" for none. */
export const filterOf = (status: TreeStatus | undefined): Filter =>
  status === undefined ? 'All' : STATUS_LABEL[status];

/** The status a filter button asks for; "All" asks for none. */
export const statusOfFilter = (filter: string): TreeStatus | undefined =>
  STATUSES.find((status) => STATUS_LABEL[status] === filter);

const DOT: Record<TreeMilestone['state'], MilestoneStatus> = {
  paid: 'Paid',
  open: 'Open',
  upcoming: 'Upcoming',
  paused: 'Paused',
  forfeited: 'Forfeited',
  missed: 'Forfeited',
};

/** The milestone dots of the card's picture (FR-082: a missed window reads as forfeited). */
export const dotsOf = ({ milestones }: PlanterTree): { month: number; status: MilestoneStatus }[] =>
  milestones.map(({ month, state }) => ({ month, status: DOT[state] }));

const nextOf = ({ milestones }: PlanterTree): TreeMilestone | undefined =>
  milestones.find(({ state }) => state === 'open' || state === 'upcoming');

const currentOf = ({ milestones, currentMilestone }: PlanterTree): TreeMilestone | undefined =>
  milestones.find(({ milestone }) => milestone === currentMilestone);

/** The share of the six milestones already paid: a count, not money. */
export const percentPaid = ({ milestones }: PlanterTree): number =>
  Math.round(
    (milestones.filter(({ state }) => state === 'paid').length / Math.max(milestones.length, 1)) *
      PERCENT,
  );

/** The funding row: what is next, or that the tree is paused or settled. */
export const fundingRow = (tree: PlanterTree): { title: string; caption: string } => {
  const next = nextOf(tree);

  if (tree.status === 'flagged') {
    return { title: pausedAt(currentOf(tree)?.month ?? 0), caption: PAUSED_UNTIL };
  }

  if (next !== undefined) {
    return { title: monthLabel(next.month), caption: nextPayout(usdc(next.amount)) };
  }

  return {
    title: ALL_SETTLED,
    caption: tree.status === 'completed' ? ALL_PAID : NO_MORE_PAYOUTS,
  };
};

const dateOf = (instant: string | null): string =>
  instant === null ? NO_DATE : localDate(instant);

const heldLine = (tree: PlanterTree, localDeviceId: string | null): string | null => {
  const { held } = tree.capture.ALIVE;

  if (tree.status !== 'alive' || held === null) {
    return null;
  }

  const status = held.status.replaceAll('_', ' ');

  return held.deviceId !== null && held.deviceId === localDeviceId
    ? submittedHere(status)
    : submitted(status);
};

/** The window line of a live tree: the open one, or the next one (of the current milestone, or the next if it was missed). */
const windowLine = (tree: PlanterTree): string | null => {
  const current = currentOf(tree);

  if (current?.state === 'open') {
    return windowOpenUntil(dateOf(current.closesAt));
  }

  if (tree.status !== 'alive') {
    return null;
  }

  const upcoming = current?.state === 'missed' ? nextOf(tree) : current;

  return upcoming === undefined ? null : nextWindow(dateOf(upcoming.opensAt));
};

/** The card's meta line, in the order of FR-082: held, paused, dead, open window, next window, settled. */
export const metaLine = (tree: PlanterTree, localDeviceId: string | null): string => {
  const held = heldLine(tree, localDeviceId);

  if (held !== null) {
    return held;
  }

  if (tree.status === 'flagged') {
    return PAUSED_META;
  }

  if (tree.status === 'dead') {
    return replantBy(dateOf(tree.replantDeadline));
  }

  return windowLine(tree) ?? SETTLED;
};

export type Action = { label: string; to: string; icon: IconName };

const recordLink = (treeId: string, kind: string): string =>
  `/app/planter/record?tree=${treeId}&kind=${kind}`;

const HELD_WORD: Record<string, string> = { needs_review: 'in review', rejected: 'rejected' };

/** The one primary action of a card (FR-083), chosen from the server's capture blocks. */
export const primaryAction = (tree: PlanterTree): Action => {
  const { ALIVE, REPLANTED } = tree.capture;

  if (ALIVE.allowed) {
    return { label: RECORD_CHECK_IN, to: recordLink(tree.treeId, 'ALIVE'), icon: 'check' };
  }

  if (tree.status === 'alive' && ALIVE.held !== null) {
    return {
      label: checkInHeld(ALIVE.held.month, HELD_WORD[ALIVE.held.status] ?? 'sent'),
      to: `/app/evidence/${ALIVE.held.id}`,
      icon: 'clock',
    };
  }

  if (REPLANTED.allowed) {
    return { label: RECORD_REPLANT, to: recordLink(tree.treeId, 'REPLANTED'), icon: 'plus' };
  }

  return { label: VIEW_TREE, to: `/trees/${tree.treeId}`, icon: 'arrow' };
};

/** "Report dead": only on a live tree the server lets a death be reported for. */
export const reportDeadLink = (tree: PlanterTree): string | null =>
  tree.status === 'alive' && tree.capture.DEAD.allowed ? recordLink(tree.treeId, 'DEAD') : null;

/** The loaded pages as one list, with the newest page's total and summary (the filter does not change between pages). */
export const flattenTrees = (pages: readonly TreesPage[] | undefined) => ({
  items: pages?.flatMap((page) => page.items) ?? [],
  total: pages?.at(-1)?.total ?? 0,
  summary: pages?.at(-1)?.summary,
});

// ---- S17 (s17-slots.md §2, §4, §6) ----
const SLOT_FILTER_PARAM = { Claimed: 'claimed', Assigned: 'anchor' } as const;

/** The `?filter=` of S17: `claimed` or `assigned`; anything else is All. */
export const parseSlotFilter = (raw: string | null): 'All' | 'Claimed' | 'Assigned' => {
  if (raw === 'claimed') {
    return 'Claimed';
  }

  return raw === 'assigned' ? 'Assigned' : 'All';
};

/** The URL value of a slot filter button; "All" has none. */
export const slotFilterParam = (filter: string): string | undefined =>
  filter === 'All' ? undefined : filter.toLowerCase();

/** The filter runs in the browser over the whole list (the endpoint takes no query). */
export const filterSlots = (slots: readonly PlanterSlot[], filter: string): PlanterSlot[] =>
  filter === 'All'
    ? [...slots]
    : slots.filter(
        ({ status }) => status === SLOT_FILTER_PARAM[filter as keyof typeof SLOT_FILTER_PARAM],
      );

/** Where "Record planting" goes: PLANTED needs the campaign, as slot ids are unique only within one. */
export const plantingLink = ({ campaign, slotId }: PlanterSlot): string =>
  `/app/planter/record?campaign=${campaign.address}&slot=${slotId}&kind=PLANTED`;
