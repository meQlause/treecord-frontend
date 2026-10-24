import type { ComponentPropsWithoutRef } from 'react';

// P5. The text roles of design-system §2.5. Headings take their size from the context class that holds them
// (`.page-heading h1`, `.section-heading h2`, …), so the element is what the primitive decides.
const ROLES = {
  eyebrow: { element: 'div', className: 'eyebrow' },
  display: { element: 'h1', className: undefined },
  detail: { element: 'h1', className: undefined },
  section: { element: 'h2', className: undefined },
  panel: { element: 'h2', className: undefined },
  body: { element: 'p', className: undefined },
  meta: { element: 'small', className: undefined },
  mono: { element: 'code', className: 'ev-code' },
} as const;

type TextProps = Omit<ComponentPropsWithoutRef<'div'>, 'className'> & {
  variant?: keyof typeof ROLES;
};

export function Text({ variant = 'body', children, ...props }: TextProps) {
  const { element: Element, className } = ROLES[variant];

  return (
    <Element className={className} {...props}>
      {variant === 'eyebrow' && <span className="tiny-line" />}
      {children}
    </Element>
  );
}
