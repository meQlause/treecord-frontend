import { motion } from 'motion/react';
import type { ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { Icon, type IconName } from '../art/Icon';
import { cardMotion } from '../motion/presets';

const PIN_SIZE = 14;
const ARROW_SIZE = 17;

type CatalogCardProps = {
  /** Position in the grid: staggers the entrance. */
  index?: number;
  /** Where the card goes (art, title and footer all link here). */
  to: string;
  art: ReactNode;
  /** The badge and label laid over the art (`.art-tags`). */
  tags?: ReactNode;
  location?: ReactNode;
  title: string;
  /** The rows between the title and the footer (target, funding row, progress, meta). */
  children?: ReactNode;
  /** The footer link text. */
  cta: ReactNode;
  /** The footer link's accessible name, naming the record. */
  ctaLabel: string;
  /** Where the footer link goes, when that is not the record (a planter's next action); `to` by default. */
  ctaTo?: string;
  /** The icon in the footer's circle: an arrow, or what the action does (check, clock, plus). */
  ctaIcon?: IconName;
  /** The mockup's own card modifier (`cb-batch-card`). */
  className?: string;
};

/** K17. A catalog card: art, tags, location, title, detail rows and a footer link. Mockup main.jsx:29. */
export function CatalogCard({
  index = 0,
  to,
  art,
  tags,
  location,
  title,
  children,
  cta,
  ctaLabel,
  ctaTo,
  ctaIcon = 'arrow',
  className = '',
}: CatalogCardProps) {
  return (
    <motion.article className={`campaign-card ${className}`.trim()} {...cardMotion(index)}>
      {/* the art link repeats the title link, so keyboards and screen readers skip it */}
      <Link className="card-art-link" to={to} tabIndex={-1} aria-hidden="true">
        {art}
      </Link>
      {tags !== undefined && <div className="art-tags">{tags}</div>}
      <div className="card-body">
        {location !== undefined && (
          <span className="location wrap-any">
            <Icon name="pin" size={PIN_SIZE} />
            {location}
          </span>
        )}
        <h2 className="clamp-2" title={title}>
          <Link to={to} data-testid="campaign-title">
            {title}
          </Link>
        </h2>
        {children}
        <Link className="card-bottom" to={ctaTo ?? to} aria-label={ctaLabel}>
          <span>{cta}</span>
          <span className="arrow-circle">
            <Icon name={ctaIcon} size={ARROW_SIZE} />
          </span>
        </Link>
      </div>
    </motion.article>
  );
}
