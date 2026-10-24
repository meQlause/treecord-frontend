import type { Role } from '../route-handle';

// shell.md §3–§4: every sentence the shell shows, verbatim from the mockup (shell.jsx, main.jsx).
export const ROLE_LABEL: Record<Role, string> = {
  donor: 'Donor',
  planter: 'Planter',
  auditor: 'Auditor',
  operator: 'Operator',
};

export const SHELL_COPY = {
  skipLink: 'Skip to content',
  brandHome: 'Treecord home',
  brandName: 'treecord',
  brandPeriod: '.',
  brandFooter: 'treecord.',
  mainNavigation: 'Main navigation',
  campaigns: 'Campaigns',
  carbonCredits: 'Carbon credits',
  signIn: 'Sign in',
  profile: 'Profile',
  thisDevice: 'This device',
  signOut: 'Sign out',
  signedOut: 'Signed out',
  dismissToast: 'Dismiss toast',
  tx: {
    region: 'Transactions',
    pending: 'Transaction sent',
    confirmed: 'Transaction confirmed',
    reverted: 'Transaction reverted',
    hash: 'Tx hash',
    block: 'Block',
    copy: 'Copy hash',
    copied: 'Copied',
    explorer: 'View on BaseScan',
    dismiss: 'Dismiss receipt',
  },
  copyright: '© 2026 Treecord',
  footerSpoken: 'Every tree, proven.',
  footerLead: 'Every tree, ',
  footerWords: ['planted.', 'measured.', 'verified.', 'proven.'],
  sidebar: {
    home: 'Home',
    myCarbon: 'My carbon',
    myTrees: 'My trees',
    slots: 'Slots',
    challenges: 'Challenges',
    uploads: 'Uploads',
    audit: 'Audit',
  },
  growthWords: { every: 'Every', tree: 'tree,', proven: 'proven.' },
} as const;

export const MOTION_COPY = {
  playing: { label: 'Pause motion', title: 'Pause motion' },
  paused: { label: 'Play motion', title: 'Play motion' },
  reduced: {
    label: 'Reduced motion enabled by your system',
    title: 'System reduced motion',
  },
} as const;

export const accountLabel = (name: string, role: string): string => `Account: ${name}, ${role}`;

export const workspaceLabel = (role: string): string => `${role} workspace`;

export const workspaceEyebrow = (role: string): string => `${role.toUpperCase()} WORKSPACE`;

export const sidebarNavLabel = (role: string): string => `${role} navigation`;
