import type { ReactNode } from 'react';

type PageHeadProps = {
  eyebrow: ReactNode;
  /** The first (plain) line of the serif title. */
  title: ReactNode;
  /** The second line, in italics. */
  em: ReactNode;
  /** One line only: `Batch #12` instead of two lines. */
  inline?: boolean;
  /** The heading scene; the column is left out without it (loading a record). */
  art?: ReactNode;
  coord?: ReactNode;
  /** The mockup's own page modifiers (`cb-batch-heading`, `pl-heading`, `tr-coord-long`). */
  className?: string;
  children?: ReactNode;
};

/** K15. The page heading: eyebrow, serif title with an `em` line, art and coordinate. Mockup planter-pages.jsx:24. */
export function PageHead({
  eyebrow,
  title,
  em,
  inline = false,
  art,
  coord,
  className = '',
  children,
}: PageHeadProps) {
  return (
    <section className={`page-heading cb-page-heading ${className}`.trim()}>
      <div>
        <div className="eyebrow">
          <span className="tiny-line" />
          {eyebrow}
        </div>
        <h1>
          {title}
          {inline ? ' ' : <br />}
          <em>{em}</em>
        </h1>
        {children}
      </div>
      {art !== undefined && (
        <div className="heading-art">
          {art}
          {coord !== undefined && <span className="hero-coordinate">{coord}</span>}
        </div>
      )}
    </section>
  );
}
