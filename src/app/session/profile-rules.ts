// Pure display rules for the signed-in account, shared by the shell, the guards and S02.
import type { Role } from '../route-handle';

// shell.md §6: where `/app` goes for each role
const HOME: Record<Role, string> = {
  donor: '/app/donor',
  planter: '/app/planter/trees',
  auditor: '/app/audit',
  operator: '/campaigns',
};

export const roleHome = (role: Role): string => HOME[role];

/** "Planter": the capitalised enum (shell.md §4). */
export const roleLabel = (role: Role): string => role.charAt(0).toUpperCase() + role.slice(1);

/** The name to show: `displayName`, else the part of the sign-in email before "@" (ui-gaps pattern 24, FR-242). */
export const nameOf = (displayName: string | null, email: string | null): string =>
  displayName ?? email?.split('@')[0] ?? '';
