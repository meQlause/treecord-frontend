import { cloneElement, isValidElement, useId, type ReactNode } from 'react';
import { Icon } from '../art/Icon';

// P9. Mockup workspace-ui.jsx:10. A labelled control. `error` (a server or rule error, NFR-071) draws FieldError under
// it and links it to the one control child with aria-invalid + aria-describedby; the input keeps its value. State the
// rule up front in `label` or `hint`.
const ERROR_ICON = 16;

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
};

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const failed = error !== undefined && error !== '';
  const linked =
    failed && isValidElement<Record<string, unknown>>(children)
      ? cloneElement(children, { 'aria-invalid': true, 'aria-describedby': id })
      : children;

  return (
    <label className="ws-field">
      <span>{label}</span>
      {linked}
      {hint !== undefined && <small>{hint}</small>}
      {failed && <FieldError id={id}>{error}</FieldError>}
    </label>
  );
}

/** The error line under a field. Outside Field, set aria-invalid and aria-describedby={id} on the control yourself. */
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span id={id} className="si-error" role="alert">
      <Icon name="warning" size={ERROR_ICON} />
      <span>{children}</span>
    </span>
  );
}
