import type { IconName } from '../../shared/art/Icon';
import type { Role } from '../route-handle';
import { SHELL_COPY } from './shell.copy';

const { sidebar } = SHELL_COPY;

// shell.md §4 Role sidebar (FR-008): each role's items in order, and which item a page belongs under.
type Item = { icon: IconName; label: string; to: string };

const CAMPAIGNS: Item = { icon: 'campaign', label: SHELL_COPY.campaigns, to: '/campaigns' };

export const SIDEBAR_ITEMS: Record<Role, readonly Item[]> = {
  donor: [
    { icon: 'home', label: sidebar.home, to: '/app/donor' },
    CAMPAIGNS,
    { icon: 'carbon', label: SHELL_COPY.carbonCredits, to: '/carbon' },
    { icon: 'leaf', label: sidebar.myCarbon, to: '/app/carbon' },
  ],
  planter: [
    { icon: 'tree', label: sidebar.myTrees, to: '/app/planter/trees' },
    { icon: 'plus', label: sidebar.slots, to: '/app/planter/slots' },
    CAMPAIGNS,
    { icon: 'flag', label: sidebar.challenges, to: '/app/planter/challenges' },
    { icon: 'check', label: sidebar.uploads, to: '/app/planter/uploads' },
  ],
  auditor: [{ icon: 'check', label: sidebar.audit, to: '/app/audit' }],
  operator: [CAMPAIGNS],
};

// first match wins, and only counts when the role has that item (the Auditor has no "My trees")
const PARENTS = [
  { pattern: /^\/(campaigns|app\/campaigns|app\/operator)/, to: '/campaigns' },
  { pattern: /^\/carbon\/retirements|^\/app\/carbon/, to: '/app/carbon' },
  { pattern: /^\/carbon/, to: '/carbon' },
  { pattern: /^\/(trees|app\/planter\/(trees|record))/, to: '/app/planter/trees' },
  { pattern: /^\/app\/(evidence|planter\/uploads)/, to: '/app/planter/uploads' },
  { pattern: /^\/(audit|app\/audit)/, to: '/app/audit' },
];

/** The `to` of the item `pathname` sits under for `role`, or undefined. */
export const activeItem = (pathname: string, role: Role): string | undefined => {
  const targets = SIDEBAR_ITEMS[role].map((item) => item.to);

  if (targets.includes(pathname)) {
    return pathname;
  }

  return PARENTS.find(({ pattern, to }) => pattern.test(pathname) && targets.includes(to))?.to;
};
