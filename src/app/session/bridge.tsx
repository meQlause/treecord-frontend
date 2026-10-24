// Mounted once under both providers: hands Privy's token getter to the API client, and clears the previous account's
// private state when the Privy user changes without a sign-out (FR-005, shell.md §4).

import { usePrivy } from '@privy-io/react-auth';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { setTokenSource } from './api';
import { clearPrivateState } from './session';

export function SessionBridge() {
  const { getAccessToken, user } = usePrivy();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const previous = useRef<string | undefined>(undefined);

  // layout effects run before any query's passive effect, so the first request already finds the getter
  useLayoutEffect(() => setTokenSource(getAccessToken), [getAccessToken]);

  useEffect(() => {
    if (userId === undefined) {
      return;
    }

    if (previous.current !== undefined && previous.current !== userId) {
      clearPrivateState(queryClient);
    }

    previous.current = userId;
  }, [userId, queryClient]);

  return null;
}
