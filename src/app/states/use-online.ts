// SH-9: the browser's online flag, from TanStack's `onlineManager` (the same one that pauses and resumes queries).

import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

const subscribe = (notify: () => void): (() => void) => onlineManager.subscribe(() => notify());

export const useOnline = (): boolean =>
  useSyncExternalStore(subscribe, () => onlineManager.isOnline());
