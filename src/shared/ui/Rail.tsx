import type { ReactNode } from 'react';
import { useStickyFit } from './useStickyFit';

const RAIL_TOP = 104;
const RAIL_GAP = 20;

/**
 * K18. The right column of a detail page: sticky, fills the screen below the header, never past the left column
 * (`--rail-room`); a rail taller than the screen keeps its bottom in view (`--rail-top`). Mockup carbon.jsx:127.
 */
export function Rail({ children }: { children: ReactNode }) {
  const ref = useStickyFit<HTMLDivElement>({
    roomVar: '--rail-room',
    topVar: '--rail-top',
    top: RAIL_TOP,
    gap: RAIL_GAP,
  });

  return (
    <div className="cb-rail" ref={ref}>
      {children}
    </div>
  );
}
