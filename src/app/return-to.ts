// NFR-050 (shell.md §6, mockup workspace-ui.jsx:42): `returnTo` is followed only when it stays inside the app.
const FALLBACK = '/app';
const INTERNAL = /^\/(?!\/)/;
// "://" is the spec's third rule; a backslash or whitespace is read by browsers as another "/" ("/\evil.example")
const UNSAFE = /:\/\/|[\\\s]/;

/** The path to go back to: starts with "/", not "//", no "://"; anything else is `fallback` (`/app`). */
export const safeReturn = (value: string | null | undefined, fallback = FALLBACK): string =>
  value !== null && value !== undefined && INTERNAL.test(value) && !UNSAFE.test(value)
    ? value
    : fallback;

/** The S02 address a guard sends a signed-out visitor to (FR-010), carrying the page they asked for. */
export const signInUrl = (from: string): string => `/sign-in?returnTo=${encodeURIComponent(from)}`;
