import { useState, type ReactNode } from 'react';
import { Banner } from './Banner';
import { Button } from './Button';
import { Facts } from './Facts';

// K10. Mockup workspace-ui.jsx:11 (`Action`), design-system §4.4 and §4.6. The inline D-dialog review:
// idle (button) -> review (region: label, optional `target` rows, summary, children, Confirm / Cancel) -> done.
// `stage` opens it part way (the mockup's states). busy: Confirm shows "Processing…", Cancel is disabled, the region has
// aria-busy. `onConfirm` may return a promise: busy lasts until it settles, then done. Return `false` or reject to stay
// in review; show the reason through `error` (inputs are kept).
export type ReviewCopy = {
  /** aria-label of the review region. */
  region: string;
  summary: string;
  confirm: string;
  cancel: string;
  close: string;
  /** The line shown at done. */
  done: string;
};

type Stage = 'idle' | 'review' | 'busy' | 'done';

type ReviewProps = {
  /** Confirm stays disabled until the review's inputs are valid. */
  ready?: boolean;
  /** Facts rows naming what a destructive action destroys (pattern 11). */
  target?: readonly (readonly [label: string, value: ReactNode])[];
  error?: ReactNode;
  busyLabel?: string;
  children?: ReactNode;
};

type ReviewActionProps = ReviewProps & {
  label: string;
  copy: ReviewCopy;
  onConfirm: () => unknown;
  disabled?: boolean;
  stage?: Stage;
  /** Shown at done, next to Close: a JobLink or the transaction link. */
  doneLink?: ReactNode;
};

type BodyProps = ReviewProps & {
  label: string;
  copy: ReviewCopy;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function ReviewBody({
  label,
  copy,
  busy,
  ready = true,
  target,
  error,
  busyLabel,
  children,
  onConfirm,
  onCancel,
}: BodyProps) {
  return (
    <div className="ws-review" role="region" aria-label={copy.region} aria-busy={busy || undefined}>
      <h3>{label}</h3>
      {target !== undefined && <Facts rows={target} />}
      <p>{copy.summary}</p>
      {children}
      {error !== undefined && error !== '' && <Banner tone="error">{error}</Banner>}
      <div className="ws-actions">
        <Button
          busy={busy}
          {...(busyLabel === undefined ? {} : { busyLabel })}
          disabled={!ready}
          onClick={onConfirm}
        >
          {copy.confirm}
        </Button>
        <Button variant="outline" disabled={busy} onClick={onCancel}>
          {copy.cancel}
        </Button>
      </div>
    </div>
  );
}

export function ReviewAction({
  label,
  copy,
  onConfirm,
  disabled = false,
  stage: initial = 'idle',
  doneLink,
  ...review
}: ReviewActionProps) {
  const [stage, setStage] = useState<Stage>(initial);
  const [pending, setPending] = useState(false);
  const busy = pending || stage === 'busy';

  const confirm = async (): Promise<void> => {
    if (busy) {
      return;
    }

    setPending(true);

    const succeeded = await Promise.resolve(onConfirm()).then(
      (result) => result !== false,
      () => false,
    );

    setPending(false);
    setStage(succeeded ? 'done' : 'review');
  };

  return (
    <div className="ws-action">
      {stage === 'idle' && (
        <Button icon="arrow" disabled={disabled} onClick={() => setStage('review')}>
          {label}
        </Button>
      )}
      {stage === 'done' && (
        <div role="status" className="ws-review">
          <p>{copy.done}</p>
          {doneLink}
          <Button variant="text" onClick={() => setStage('idle')}>
            {copy.close}
          </Button>
        </div>
      )}
      {(stage === 'review' || stage === 'busy') && (
        <ReviewBody
          {...review}
          label={label}
          copy={copy}
          busy={busy}
          onConfirm={confirm}
          onCancel={() => setStage('idle')}
        />
      )}
    </div>
  );
}
