import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Toast } from '../../shared/ui/Toast';
import { SHELL_COPY } from './shell.copy';

// shell.md §4 "Toasts": one toast at a time; a new one replaces the current. The provider holds the toast, the layout
// draws it with <ToastArea/> inside `.app`, and callers only ever get `notify`.
type ToastState = { message: string; error: boolean };
type Notifier = { notify: (message: string, error?: boolean) => void };
type Shown = { toast: ToastState | null; dismiss: () => void };

const NotifyContext = createContext<Notifier | null>(null);
const ShownContext = createContext<Shown | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const notify = useCallback((message: string, error = false) => setToast({ message, error }), []);
  const dismiss = useCallback(() => setToast(null), []);
  const notifier = useMemo(() => ({ notify }), [notify]);
  const shown = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <NotifyContext.Provider value={notifier}>
      <ShownContext.Provider value={shown}>{children}</ShownContext.Provider>
    </NotifyContext.Provider>
  );
}

export function useToast(): Notifier {
  const notifier = useContext(NotifyContext);

  if (notifier === null) {
    throw new Error('useToast needs a ToastProvider above it');
  }

  return notifier;
}

export function ToastArea() {
  const shown = useContext(ShownContext);

  if (shown === null) {
    throw new Error('ToastArea needs a ToastProvider above it');
  }

  return (
    <Toast toast={shown.toast} dismissLabel={SHELL_COPY.dismissToast} onDismiss={shown.dismiss} />
  );
}
