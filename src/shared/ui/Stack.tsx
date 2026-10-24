import type { ComponentPropsWithoutRef, CSSProperties } from 'react';

// P3. No mockup class: the flex rows with a gap that new markup uses. `gap` is a `--space-N` step (design-system §2.6).
type StackProps = Omit<ComponentPropsWithoutRef<'div'>, 'className'> & {
  direction?: 'row' | 'column';
  gap?: number;
};

const DEFAULT_GAP = 7;

export function Stack({ direction = 'column', gap = DEFAULT_GAP, style, ...props }: StackProps) {
  const layout: CSSProperties = {
    display: 'flex',
    flexDirection: direction,
    gap: `var(--space-${gap})`,
  };

  return <div style={{ ...layout, ...style }} {...props} />;
}
