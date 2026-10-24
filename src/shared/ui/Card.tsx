import type { ComponentPropsWithoutRef } from 'react';

// P2. The mockup's own surfaces: the catalog card, the soft review box, the skeleton card (design-system §4.1).
const VARIANT_CLASS = {
  catalog: 'campaign-card',
  review: 'ws-review',
  skeleton: 'skeleton-card',
};

type CardProps = Omit<ComponentPropsWithoutRef<'div'>, 'className'> & {
  variant?: keyof typeof VARIANT_CLASS;
};

export function Card({ variant = 'catalog', ...props }: CardProps) {
  return <div className={VARIANT_CLASS[variant]} {...props} />;
}
