import { motion } from 'motion/react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from '../art/Icon';
import { popMotion } from '../motion/presets';

// P6. Mockup my-carbon.jsx:56. A native modal <dialog> that opens with `popMotion`. Mount it to open, unmount to close
// (wrap it in AnimatePresence for the exit). While `busy` a transaction or job is in flight: Escape and the close
// button do nothing (design-system §4.4).
type DialogProps = {
  title: string;
  description?: string;
  /** The close button's accessible name (copy, rule 12). */
  closeLabel: string;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Dialog({
  title,
  description,
  closeLabel,
  busy = false,
  onClose,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;

    if (dialog !== null && !dialog.open) {
      dialog.showModal();
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;

      if (previous instanceof HTMLElement) {
        previous.focus();
      }
    };
  }, []);

  return (
    <motion.dialog
      ref={ref}
      {...popMotion}
      className="mc-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        // the parent unmounts us; the browser must not close the dialog behind its back
        event.preventDefault();

        if (!busy) {
          onClose();
        }
      }}
    >
      <button
        className="icon-button mc-close"
        type="button"
        aria-label={closeLabel}
        disabled={busy}
        onClick={onClose}
      >
        <Icon name="close" />
      </button>
      <h2 id={titleId}>{title}</h2>
      {description !== undefined && <p>{description}</p>}
      {children}
    </motion.dialog>
  );
}
