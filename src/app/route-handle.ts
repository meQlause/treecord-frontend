/** The four account roles (accounts.md §1). */
export type Role = 'donor' | 'planter' | 'auditor' | 'operator';

/** Read by `RoleGate` through `useMatches()`; a route without `roles` is open to any signed-in account. */
export type RouteHandle = { roles?: readonly Role[] };
