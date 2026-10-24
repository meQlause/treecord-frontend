// Every sentence the workspace states show (shell.md §3, ui-gaps patterns 1, 8, 13, 14).
export const LOADING = 'Loading workspace…';

export const ERROR_TITLE = 'Could not load this page';

export const ERROR_BODY = 'Your inputs and local records are unchanged.';

export const TRY_AGAIN = 'Try again';

export const OFFLINE = 'Offline · showing saved data. Network actions are unavailable.';

export const REFRESH = 'Refresh';

export const ROLE_UNAVAILABLE = 'Role unavailable';

/** SH-11: "This screen is for Planter accounts." */
export const roleBody = (role: string): string => `This screen is for ${role} accounts.`;

/** What the mockup names a role it does not know (a read that answered 403). */
export const OTHER_ROLE = 'another role';

/** COPY-104: lorem until the owner approves the sentence for a screen open to two roles (SH-12). */
export const ROLE_UNAVAILABLE_TWO = 'COPY-104';

export const NOT_FOUND = 'Not found';

export const PAGE_NOT_FOUND = 'Page not found';
