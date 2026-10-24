// TanStack Query as configuration (fe-stack.md §1, NFR-063): never retry on its own (the person presses "Try again", one
// request per press: SI-AC17, SH-AC17; a hung request ends at its 30 s limit, pattern 15), pause polling while the tab
// is hidden, and send a refused token to S02 once, whichever request met it (SH-15).

import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../shared/api/errors';

/** `onSessionExpired` runs when any query or mutation answers 401 `missing_token` / `invalid_token`; it is never re-sent. */
export function createQueryClient(onSessionExpired: () => void): QueryClient {
  const onError = (error: unknown): void => {
    if (error instanceof ApiError && error.class === 'navigation') {
      onSessionExpired();
    }
  };

  return new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      // online/offline comes from TanStack's `onlineManager`: queries pause offline and resume on reconnect
      queries: { retry: false, refetchIntervalInBackground: false },
      mutations: { retry: false },
    },
  });
}
