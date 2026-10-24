// shell.md §4: which route is which. The mockup decided these with regexes over the hash (main.jsx:338); the shell
// reads the pathname instead.
export const RECORD_PATH = '/app/planter/record';

const CARBON = /^\/(carbon|app\/carbon)(\/|$)/;
const WORKSPACE = /^\/(sign-in|trees(\/|$)|audit\/[^/]+\/reproduce|app(\/|$))/;

export const isCarbonPath = (pathname: string): boolean => CARBON.test(pathname);

export const isWorkspacePath = (pathname: string): boolean =>
  !isCarbonPath(pathname) && WORKSPACE.test(pathname);

type AppClass = { signedIn: boolean; pathname: string; still: boolean };

/** The `.app` classes the moved CSS keys on: signed-in, the donor/carbon page skins, motion-paused. */
export const appClassName = ({ signedIn, pathname, still }: AppClass): string => {
  const skin = pathname === '/app/donor' ? 'app--donor' : '';

  return [
    'app',
    signedIn && 'signed-in',
    skin,
    isCarbonPath(pathname) && 'app--carbon',
    still && 'motion-paused',
  ]
    .filter(Boolean)
    .join(' ');
};
