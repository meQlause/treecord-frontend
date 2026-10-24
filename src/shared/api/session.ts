// D-7 (docs/FE/fe-stack.md §1.1): there is no kept login. Everything the Privy SDK left in browser storage by an earlier
// page load is removed before the SDK mounts, so a reload signs the person out and the page never reads an old token.
const PRIVY_KEY = /^privy[:-]/;
const PRIVY_COOKIE = 'privy-token';

const forget = (storage: Storage): void => {
  Object.keys(storage)
    .filter((key) => PRIVY_KEY.test(key))
    .forEach((key) => storage.removeItem(key));
};

/** Call once at boot, before `PrivyProvider` mounts. */
export const forgetStoredSession = (): void => {
  forget(window.localStorage);
  forget(window.sessionStorage);
  document.cookie = `${PRIVY_COOKIE}=; Max-Age=0; path=/`;
};
