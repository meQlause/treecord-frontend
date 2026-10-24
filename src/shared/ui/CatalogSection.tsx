import type { ReactNode } from 'react';

type CatalogSectionProps = {
  title: string;
  kicker: ReactNode;
  /** The status filter labels; the group is left out without them. */
  filters?: readonly string[];
  /** The accessible name of the filter group. */
  filtersLabel?: string;
  value?: string;
  onChange?: (filter: string) => void;
  /** The select and search fields beside the status filters (`.secondary-filters`). */
  secondary?: ReactNode;
  /** The result count; announced politely when it changes. */
  meta: ReactNode;
  /** The right side of the results row ("Newest first", or a Clear filters button). */
  aside?: ReactNode;
  className?: string;
  id?: string;
  children: ReactNode;
};

type FiltersProps = Pick<CatalogSectionProps, 'filters' | 'filtersLabel' | 'value' | 'onChange'>;

function StatusFilters({ filters = [], filtersLabel, value, onChange }: FiltersProps) {
  return (
    <div className="status-filters" role="group" aria-label={filtersLabel}>
      {filters.map((filter) => (
        <button
          key={filter}
          type="button"
          aria-pressed={value === filter}
          className={value === filter ? 'selected' : ''}
          onClick={() => onChange?.(filter)}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}

/** K16. A catalog: serif title with a dot, kicker, status filters, results meta and the cards. Mockup planter-pages.jsx:25. */
export function CatalogSection({
  title,
  kicker,
  secondary,
  meta,
  aside,
  className = '',
  id,
  children,
  ...filters
}: CatalogSectionProps) {
  return (
    <section className={`catalog ${className}`.trim()} aria-label={title} id={id}>
      <div className="catalog-heading">
        <h2>
          {title}
          <span className="heading-dot" />
        </h2>
        <span className="catalog-kicker">{kicker}</span>
      </div>
      {(filters.filters !== undefined || secondary !== undefined) && (
        <div className="filter-bar">
          {filters.filters !== undefined && <StatusFilters {...filters} />}
          {secondary !== undefined && <div className="secondary-filters">{secondary}</div>}
        </div>
      )}
      <div className="results-meta">
        <span aria-live="polite">{meta}</span>
        {aside}
      </div>
      {children}
    </section>
  );
}
