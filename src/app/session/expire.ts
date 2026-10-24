// SH-15 (shell.md §3, ui-gaps pattern 12): a private request was refused with 401. Clear what was private, go to S02
// with the page to come back to, and say why.

import type { QueryClient } from '@tanstack/react-query';
import type { DataRouter } from 'react-router';
import { signInUrl } from '../return-to';

/** `location.state.reason` S02 reads to show the "session ended" banner (COPY-400). */
export const SESSION_EXPIRED = 'session-expired';

const SIGN_IN = '/sign-in';
const PUBLIC_KEY = 'public';

/**
 * Public reads (`['public', …]`) survive; everything keyed on an account goes. Drafts survive too (fe-architecture §4).
 * A read that failed holds nothing private and stays: removing it would make the mounted shell ask again at once, and
 * the refused request must not be repeated (SH-15, SH-AC14).
 */
export const expireSession = (
  queryClient: QueryClient,
  router: Pick<DataRouter, 'state' | 'navigate'>,
): void => {
  const { location, navigation } = router.state;

  // several requests fail together: the first one navigates, the rest find a navigation under way
  if (navigation.state !== 'idle' || location.pathname === SIGN_IN) {
    return;
  }

  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== PUBLIC_KEY && query.state.status !== 'error',
  });
  void router.navigate(signInUrl(location.pathname + location.search), {
    replace: true,
    state: { reason: SESSION_EXPIRED },
  });
};
