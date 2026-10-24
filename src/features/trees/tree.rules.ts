// The pure rules of S05 (s05-tree.md §2 "Formatting", §3, §4): what the record says, from the fields the API sent.
import type { TreeArtKind } from '../../shared/art/TreeArt';
import { shortAddress } from '../../shared/format/address';
import { localDate } from '../../shared/format/datetime';
import { usdc } from '../../shared/format/money';
import type {
  Flag,
  LiveSubmission,
  Milestone,
  TimelineEvent,
  TreeDetail,
  TreeStatus,
} from './tree.api';
import * as copy from './tree.copy';

const TREE_ID = /^[1-9]\d{0,18}$/;
const MAX_TREE_ID = 9223372036854775807n;
const EXACT_DIGITS = 6;
const APPROX_DIGITS = 3;
const TX_PREFIX = 10;
const FLAG_ID_LENGTH = 8;
const LONG_PROSE = 120;
const LONG_REGION = 40;
const THUMBNAIL_LIFE_MS = 900_000;

/** s05 §4: `^[1-9][0-9]{0,18}$` and at most the largest bigint, compared as a bigint (REG-001). */
export const isTreeId = (value: string): boolean =>
  TREE_ID.test(value) && BigInt(value) <= MAX_TREE_ID;

export const label = (status: string): string => copy.STATUS_LABEL[status] ?? status;

const ART: Readonly<Record<TreeStatus, TreeArtKind>> = {
  alive: 'growing',
  flagged: 'flagged',
  dead: 'dead',
  removed: 'removed',
  completed: 'completed',
};

export const artKind = (status: TreeStatus): TreeArtKind => ART[status];

/** FR-053, S8 decision 30: exact → 6 decimals; a geohash cell centre → 3 decimals, labelled. */
export const locationText = (location: TreeDetail['tree']['location']): string =>
  location.precision === 'exact'
    ? `${location.lat.toFixed(EXACT_DIGITS)}, ${location.lon.toFixed(EXACT_DIGITS)}`
    : `${location.lat.toFixed(APPROX_DIGITS)}, ${location.lon.toFixed(APPROX_DIGITS)} · ${copy.APPROXIMATE}`;

/** A long prose value reads left-aligned under its label instead of a right-aligned column. */
export const isLongProse = (text: string): boolean => text.length > LONG_PROSE;

export const isLongRegion = (region: string): boolean => region.length > LONG_REGION;

export const windowText = (milestone: Milestone): string =>
  `${localDate(milestone.opensAt)} – ${localDate(milestone.closesAt)}`;

export const amountText = (amount: string | null): string =>
  amount === null ? '—' : `${usdc(amount)} ${copy.AMOUNT_UNIT}`;

export type Row = readonly [label: string, value: string];

/** M-3 / M-4: the payouts panel's three facts. */
export const payoutFacts = (data: TreeDetail): Row[] => {
  const { summary, payouts, forfeits, tree } = data;
  const last = payouts.at(-1);
  const forfeited = forfeits.length > 0 || tree.status === 'removed';

  return [
    [
      copy.FACTS.recorded,
      summary.milestonesPaid > 0
        ? copy.recorded(summary.milestonesPaid, usdc(summary.paidAmount))
        : copy.NONE,
    ],
    [
      copy.FACTS.planter,
      last === undefined
        ? copy.NONE
        : `${shortAddress(last.planterAddress)} · ${last.txHash.slice(0, TX_PREFIX)}…`,
    ],
    [copy.FACTS.forfeited, forfeited ? copy.FORFEITED_NOTE : copy.NONE],
  ];
};

/** F-2: `#{id8}`, as flags.md §2 renders "Flag #1f6c2a9e". */
export const flagFacts = (flag: Flag): Row[] => [
  [copy.FLAG_FACTS.flag, `#${flag.id.slice(0, FLAG_ID_LENGTH)}`],
  [copy.FLAG_FACTS.status, label(flag.status)],
  [copy.FLAG_FACTS.reason, flag.reasonText],
  [copy.FLAG_FACTS.resolution, flag.resolutionNote ?? copy.NOT_RESOLVED],
];

/** The lifecycle card's growth share, 0–1: `currentMonth / 36`, full when completed. */
export const growth = (data: TreeDetail): number =>
  data.tree.status === 'completed'
    ? 1
    : Math.min(1, data.summary.currentMonth / copy.MONTHS_TO_GROW);

export const shownMonth = (data: TreeDetail): number =>
  data.tree.status === 'completed' ? copy.MONTHS_TO_GROW : data.summary.currentMonth;

const TITLES: Readonly<Record<string, copy.Message>> = {
  planted: copy.PLANTED,
  replanted: copy.REPLANTED,
  flag_resolved: copy.FLAG_RESOLVED,
};

/** The row title of a timeline event (TL-2…TL-7). */
export const timelineTitle = (event: TimelineEvent): copy.Message => {
  if (event.kind === 'check_in') {
    return event.evidence === null
      ? copy.CHECK_IN_NO_MONTH
      : copy.checkInTitle(event.evidence.month);
  }

  return TITLES[event.kind] ?? label(event.kind);
};

const NOTES: Readonly<Record<string, string>> = {
  planted: copy.PLANTED_NOTE,
  check_in: copy.CHECK_IN_NOTE,
};

export const timelineNote = (kind: string): string => NOTES[kind] ?? copy.STATUS_NOTE;

/** TL-9: a thumbnail URL is good for 15 minutes; older than that and a failed image means the tree is read again. */
export const thumbnailExpired = (updatedAt: number, now: number): boolean =>
  now - updatedAt > THUMBNAIL_LIFE_MS;

export type Action = {
  key: string;
  to: string;
  text: string;
  className: string;
  icon: 'check' | 'clock' | 'plus' | 'warning';
};

const PRIMARY = 'button primary';

const captureLink = (id: string, kind: string): string =>
  `/app/planter/record?tree=${id}&kind=${kind}`;

const liveKinds = (data: TreeDetail, kind: string): LiveSubmission[] =>
  data.viewer?.liveSubmissions.filter((item) => item.kind === kind) ?? [];

/** A-1: alive, a milestone open, and no live check-in for that milestone. */
const checkInAction = (data: TreeDetail): Action[] => {
  const open = data.milestones.find((milestone) => milestone.status === 'open');
  const held = liveKinds(data, 'ALIVE').some((item) => item.month === open?.month);

  return data.tree.status === 'alive' && open !== undefined && !held
    ? [
        {
          key: 'check-in',
          to: captureLink(data.tree.treeId, 'ALIVE'),
          text: copy.RECORD_CHECK_IN,
          className: PRIMARY,
          icon: 'check',
        },
      ]
    : [];
};

/** A-2: a live check-in links to its evidence page. */
const liveActions = (data: TreeDetail): Action[] =>
  liveKinds(data, 'ALIVE').map((item) => ({
    key: item.id,
    to: `/app/evidence/${item.id}`,
    text: copy.liveCheckIn(item.month, item.status),
    className: PRIMARY,
    icon: 'clock',
  }));

/** A-3: dead, the replant deadline still ahead, no live replant. */
const replantAction = (data: TreeDetail, now: number): Action[] => {
  const { replantDeadline, status, treeId } = data.tree;
  const open = status === 'dead' && replantDeadline !== null && Date.parse(replantDeadline) > now;

  return open && liveKinds(data, 'REPLANTED').length === 0
    ? [
        {
          key: 'replant',
          to: captureLink(treeId, 'REPLANTED'),
          text: copy.RECORD_REPLANT,
          className: PRIMARY,
          icon: 'plus',
        },
      ]
    : [];
};

/** A-4: alive and no live death report. */
const deadAction = (data: TreeDetail): Action[] =>
  data.tree.status === 'alive' && liveKinds(data, 'DEAD').length === 0
    ? [
        {
          key: 'dead',
          to: captureLink(data.tree.treeId, 'DEAD'),
          text: copy.REPORT_DEAD,
          className: 'button outline tr-warn',
          icon: 'warning',
        },
      ]
    : [];

/** A-1…A-4, the planter's capture links, from facts only (the target precheck runs when S19 opens). */
export const planterActions = (data: TreeDetail, now: number): Action[] =>
  data.viewer?.isPlanter === true
    ? [
        ...checkInAction(data),
        ...liveActions(data),
        ...replantAction(data, now),
        ...deadAction(data),
      ]
    : [];
