// C-15 / C-16 and S-3: once the browser has gone offline, the cached page wears the "saved data" banner until "Refresh"
// succeeds — back online alone does not take it off. Shared by the public catalog (S03) and the donor home (S13).
import { onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export function useStale() {
  const [stale, setStale] = useState(() => !onlineManager.isOnline());

  useEffect(
    () =>
      onlineManager.subscribe((online) => {
        if (!online) {
          setStale(true);
        }
      }),
    [],
  );

  return [stale, setStale] as const;
}
