// docs/FE/features/shell.md §6 and docs/FE/fidelity.md §1: every route of the app, each lazy-loading its screen module.
// A screen module exports `Component`; its phase replaces the module, never this table (phases.md §1.3). Guards are
// layout routes: `RequireSession` for `/app`, `RoleGate` reading the `handle.roles` of its group.
import type { RouteObject } from 'react-router';
import type { Role, RouteHandle } from './route-handle';

/** A layout route that lets only `allowed` through; `RoleGate` reads `handle.roles`. */
const gated = (allowed: readonly Role[], children: RouteObject[]): RouteObject => ({
  lazy: () => import('./guards/role-gate.layout'),
  handle: { roles: allowed } satisfies RouteHandle,
  children,
});

const publicRoutes: RouteObject[] = [
  { path: 'sign-in', lazy: () => import('../features/accounts/sign-in.page') },
  { path: 'campaigns', lazy: () => import('../features/campaigns/campaigns.page') },
  { path: 'campaigns/:address', lazy: () => import('../features/campaigns/campaign.page') },
  { path: 'campaigns/:address/report', lazy: () => import('../features/reports/report.page') },
  { path: 'trees/:treeId', lazy: () => import('../features/trees/tree.page') },
  { path: 'carbon', lazy: () => import('../features/carbon/carbon.page') },
  { path: 'carbon/:batchId', lazy: () => import('../features/carbon/batch.page') },
  {
    path: 'carbon/retirements/:retirementId',
    lazy: () => import('../features/carbon/certificate.page'),
  },
  { path: 'audit/:sessionId/reproduce', lazy: () => import('../features/audit/reproduce.page') },
];

const signedInRoutes: RouteObject[] = [
  { path: 'profile', lazy: () => import('../features/accounts/profile.page') },
  { path: 'jobs/:id', lazy: () => import('../features/accounts/job.page') },
  { path: 'evidence/:id', lazy: () => import('../features/planter/evidence.page') },
  { path: 'carbon', lazy: () => import('../features/carbon/my-carbon.page') },
];

const donorOrOperator = gated(
  ['donor', 'operator'],
  [
    { path: 'donor', lazy: () => import('../features/donor/donor-home.page') },
    { path: 'campaigns/new', lazy: () => import('../features/campaigns/create-campaign.page') },
  ],
);

const planter = gated(
  ['planter'],
  [
    { path: 'planter/trees', lazy: () => import('../features/planter/my-trees.page') },
    { path: 'planter/slots', lazy: () => import('../features/planter/slots.page') },
    { path: 'planter/challenges', lazy: () => import('../features/planter/challenges.page') },
    { path: 'planter/record', lazy: () => import('../features/planter/record.page') },
    { path: 'planter/uploads', lazy: () => import('../features/planter/uploads.page') },
    { path: 'planter/device', lazy: () => import('../features/planter/device.page') },
  ],
);

const operator = gated(
  ['operator'],
  [
    {
      path: 'operator/campaigns/:address',
      lazy: () => import('../features/operations/campaign-operations.page'),
    },
    { path: 'operator/submissions/:id', lazy: () => import('../features/operations/review.page') },
    {
      path: 'operator/trees/:treeId/flags/:flagId',
      lazy: () => import('../features/operations/resolve-flag.page'),
    },
  ],
);

const auditor = gated(
  ['auditor'],
  [
    { path: 'audit', lazy: () => import('../features/audit/audit.page') },
    { path: 'audit/:sessionId', lazy: () => import('../features/audit/audit-session.page') },
    {
      path: 'audit/:sessionId/trees/:treeId',
      lazy: () => import('../features/audit/sampled-tree.page'),
    },
    { path: 'audit/:sessionId/report', lazy: () => import('../features/audit/audit-report.page') },
  ],
);

const notFound: RouteObject = { path: '*', lazy: () => import('./not-found.page') };

export const routes: RouteObject[] = [
  {
    path: '/',
    lazy: () => import('./shell/shell.layout'),
    children: [
      { index: true, lazy: () => import('./landing.page') },
      ...publicRoutes,
      {
        path: 'app',
        lazy: () => import('./guards/require-session.layout'),
        children: [
          { index: true, lazy: () => import('./app-home.page') },
          ...signedInRoutes,
          donorOrOperator,
          planter,
          operator,
          auditor,
          notFound,
        ],
      },
      notFound,
    ],
  },
];
