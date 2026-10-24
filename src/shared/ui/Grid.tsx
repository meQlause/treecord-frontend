import type { ComponentPropsWithoutRef } from 'react';

// P4. `cards` is the three-column catalog grid; `rail` is the main column beside the 340 px rail.
const VARIANT_CLASS = {
  cards: 'campaign-grid',
  rail: 'detail-layout',
};

type GridProps = Omit<ComponentPropsWithoutRef<'div'>, 'className'> & {
  variant?: keyof typeof VARIANT_CLASS;
};

export function Grid({ variant = 'cards', ...props }: GridProps) {
  return <div className={VARIANT_CLASS[variant]} {...props} />;
}
