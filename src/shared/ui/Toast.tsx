import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Icon, type IconName } from '../art/Icon';
import { popMotion } from '../motion/presets';

// P7. Mockup main.jsx:354. The shell owns the one toast in flight; this draws it and dismisses it after 4 s.
const TOAST_MS = 4000;
const ICON_SIZE = 18;
const CLOSE_SIZE = 16;

const TONE: Record<'default' | 'error', { className: string; icon: IconName }> = {
  default: { className: 'toast', icon: 'check' },
  error: { className: 'toast toast-error', icon: 'warning' },
};

type ToastMessage = { message: string; error?: boolean };

type ToastProps = {
  toast: ToastMessage | null;
  /** The dismiss button's accessible name (copy, rule 12). */
  dismissLabel: string;
  onDismiss: () => void;
};

export function Toast({ toast, dismissLabel, onDismiss }: ToastProps) {
  // the timer restarts only for a new toast, not for every render of a parent that passes a fresh callback
  const dismiss = useRef(onDismiss);

  useEffect(() => {
    dismiss.current = onDismiss;
  });

  useEffect(() => {
    if (toast === null) {
      return undefined;
    }

    const timer = setTimeout(() => dismiss.current(), TOAST_MS);

    return () => clearTimeout(timer);
  }, [toast]);

  const tone = TONE[toast?.error === true ? 'error' : 'default'];

  return (
    <div className="toast-area" aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {toast !== null && (
          <motion.div key={toast.message} className={tone.className} {...popMotion}>
            <span className="toast-icon">
              <Icon name={tone.icon} size={ICON_SIZE} />
            </span>
            <span>{toast.message}</span>
            <button
              className="icon-button"
              type="button"
              aria-label={dismissLabel}
              onClick={onDismiss}
            >
              <Icon name="close" size={CLOSE_SIZE} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
