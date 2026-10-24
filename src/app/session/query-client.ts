// TanStack Query as configuration (fe-stack.md §1, NFR-063): retry only what error-handling §5 calls `retry`, pause
// polling while the tab is hidden, and send a refused token to S02 once, whichever request met it (SH-15).

import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../shared/api/errors';

// one more try after the first failure: a blip heals, a down server shows "Could not load this page" within seconds
const MAX_RETRIES = 1;

const shouldRetry = (failures: number, error: unknown): boolean =>
  error instanceof ApiError && error.class === 'retry' && failures <= MAX_RETRIES;

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
      queries: { retry: shouldRetry, refetchIntervalInBackground: false },
      mutations: { retry: false },
    },
  });
}
