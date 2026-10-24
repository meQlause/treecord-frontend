// Page names for the document title (FR-016, shell.md §4): the SRS §1.2 / mockup `pages` table (workspace-data.js:82-86),
// as route patterns. A page with a title of its own (a campaign, a tree) sets it itself once its data arrives.
export const TITLE_SUFFIX = 'Treecord';

export const TITLE_FALLBACK = 'Not found';

export const PAGE_TITLES: readonly (readonly [pattern: string, title: string])[] = [
  ['/sign-in', 'Sign in'],
  ['/campaigns', 'Campaigns'],
  ['/campaigns/:address', 'Campaign detail'],
  ['/campaigns/:address/report', 'Impact report'],
  ['/trees/:treeId', 'Tree detail'],
  ['/carbon', 'Carbon credits'],
  ['/carbon/:batchId', 'Carbon batch'],
  ['/carbon/retirements/:retirementId', 'Retirement certificate'],
  ['/audit/:sessionId/reproduce', 'Reproduce audit'],
  ['/app', 'Your workspace'],
  ['/app/profile', 'Profile'],
  ['/app/jobs/:id', 'Transaction / job'],
  ['/app/donor', 'Home'],
  ['/app/campaigns/new', 'Create campaign'],
  ['/app/carbon', 'My carbon'],
  ['/app/planter/trees', 'My trees'],
  ['/app/planter/slots', 'Unplanted slots'],
  ['/app/planter/challenges', 'Challenges'],
  ['/app/planter/record', 'Record evidence'],
  ['/app/planter/uploads', 'Uploads'],
  ['/app/planter/device', 'This device'],
  ['/app/evidence/:id', 'Evidence detail'],
  ['/app/audit', 'Open audit'],
  ['/app/audit/:sessionId', 'Audit session'],
  ['/app/audit/:sessionId/trees/:treeId', 'Sampled evidence'],
  ['/app/audit/:sessionId/report', 'Closed audit report'],
  ['/app/operator/campaigns/:address', 'Campaign operations'],
  ['/app/operator/submissions/:id', 'Submission review'],
  ['/app/operator/trees/:treeId/flags/:flagId', 'Resolve flag'],
];

/** SH-6, the interim `/app` page: "Open planter workspace" (lower-case role). */
export const YOUR_WORKSPACE = 'Your workspace';

export const openWorkspace = (role: string): string => `Open ${role.toLowerCase()} workspace`;
