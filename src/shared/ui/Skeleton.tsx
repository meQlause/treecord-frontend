import { useEffect, useState, type ReactNode } from 'react';

// P11. Mockup workspace-ui.jsx (Skeleton). Placeholder blocks in the shape of what lands. They appear only after
// 300 ms, so a fast answer never flashes; the shimmer is CSS and stops under the motion gate (design-system §2.10).
const AFTER_MS = 300;
const CARD_KEYS = ['first', 'second', 'third'];

/** true once `delay` ms have passed: gates skeletons and the refresh dim. */
export function useAfter(delay = AFTER_MS): boolean {
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPassed(true), delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return passed;
}

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton image" />
      <div className="skeleton-content">
        <div className="skeleton small" />
        <div className="skeleton title" />
        <div className="skeleton small" />
        <div className="skeleton bar" />
      </div>
    </div>
  );
}

type SkeletonShape = 'page' | 'cards' | 'list' | 'panel' | 'region';

const BLOCKS: Record<SkeletonShape, ReactNode> = {
  page: (
    <div className="detail-layout">
      <div>
        <div className="skeleton title" />
        <div className="skeleton small" />
        <div className="skeleton ws-skel-panel" />
        <div className="skeleton ws-skel-panel" />
      </div>
      <div className="skeleton ws-skel-rail" />
    </div>
  ),
  cards: (
    <div className="campaign-grid">
      {CARD_KEYS.map((key) => (
        <SkeletonCard key={key} />
      ))}
    </div>
  ),
  list: (
    <>
      <div className="skeleton title" />
      <div className="skeleton donor-list-skeleton" />
    </>
  ),
  panel: (
    <div className="ws-panel">
      <div className="skeleton title" />
      <div className="skeleton small" />
      <div className="skeleton small" />
    </div>
  ),
  region: <div className="skeleton small" />,
};

const BOX: Partial<Record<SkeletonShape, string>> = { page: 'ws-loading', list: 'ws-loading' };

type SkeletonProps = {
  shape?: SkeletonShape;
  /** The screen's own loading line; without it a screen-reader-only "Loading…" is announced. */
  label?: ReactNode;
};

export function Skeleton({ shape = 'page', label }: SkeletonProps) {
  const shown = useAfter();
  const box = BOX[shape];

  return (
    <div className={box} role="status" aria-busy="true">
      {label === undefined ? (
        <span className="sr-only">Loading…</span>
      ) : (
        <p className={box === undefined ? undefined : 'eyebrow'}>{label}</p>
      )}
      {shown && <div aria-hidden="true">{BLOCKS[shape]}</div>}
    </div>
  );
}
