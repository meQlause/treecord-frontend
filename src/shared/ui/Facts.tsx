import type { ReactNode } from 'react';

// K9. Mockup workspace-ui.jsx:7. `dl` rows of [label, value]; a missing value shows "—".
const DASH = '—';

/** A missing value (`null`, `undefined`, `''`) becomes "—" (pattern 17). */
export function orDash<T>(value: T | null | undefined): T | typeof DASH {
  return value === null || value === undefined || value === '' ? DASH : value;
}

export function Facts({ rows }: { rows: readonly (readonly [label: string, value: ReactNode])[] }) {
  return (
    <dl className="ws-facts">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{orDash(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
