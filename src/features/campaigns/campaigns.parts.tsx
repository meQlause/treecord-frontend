// S03's pieces (s03-campaigns.md §1): the card, the loading grid, the two secondary filters and the empty / error state.
import { useEffect, useState } from 'react';
import { Icon } from '../../shared/art/Icon';
import { Photo } from '../../shared/art/Photo';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { CatalogCard } from '../../shared/ui/CatalogCard';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Progress } from '../../shared/ui/Progress';
import { number } from '../../shared/format/number';
import { artForSpecies } from './art';
import type { CampaignItem, Species } from './campaigns.api';
import {
  ALL_SPECIES,
  CLEAR_FILTERS,
  CLEAR_REGION,
  EMPTY_BODY,
  EMPTY_EYEBROW,
  EMPTY_TITLE,
  FAILED_BODY,
  FAILED_EYEBROW,
  FAILED_TITLE,
  FILTERED_BODY,
  FILTERED_TITLE,
  FUNDING_PROGRESS,
  LOADING_GRID,
  REGION_FILTER_LABEL,
  REGION_PLACEHOLDER,
  SPECIES_FILTER_LABEL,
  STATUS_LABEL,
  TRY_AGAIN,
  VIEW_CAMPAIGN,
  monthsLabel,
  viewCampaignLabel,
} from './campaigns.copy';
import { barPercent, cardMeta, percentOf, usdc, type CatalogView } from './campaigns.rules';
import { untitledCampaign } from '../../shared/ui/approved-copy';

const SMALL_ICON = 14;
const FIELD_ICON = 16;
const SELECT_ICON = 17;
const TREE_ICON = 17;
const SKELETON_CARDS = ['one', 'two', 'three', 'four', 'five', 'six'];
const REGION_DEBOUNCE_MS = 300;
const REGION_MAX_LENGTH = 120;

/** `main.jsx:29`: one campaign. The API has no art field, so the picture follows the species (FD-23). */
export function CampaignCard({ item, index }: { item: CampaignItem; index: number }) {
  const title = item.title ?? untitledCampaign(item.address);

  return (
    <CatalogCard
      index={index}
      to={`/campaigns/${item.address}`}
      art={<Photo kind={artForSpecies(item.species?.code)} />}
      tags={
        <>
          <Badge status={STATUS_LABEL[item.status]} />
          {item.species !== null && <span className="species-label">{item.species.name}</span>}
        </>
      }
      location={item.region?.name}
      title={title}
      cta={VIEW_CAMPAIGN}
      ctaLabel={viewCampaignLabel(title)}
    >
      <div className="tree-target">
        <Icon name="tree" size={TREE_ICON} />
        <strong>{number(item.treeTarget)}</strong> trees<span className="dot-separator">·</span>
        {monthsLabel(item.commitmentUnits)}
      </div>
      <div className="funding-row">
        <span>
          <strong>{usdc(item.fundedAmount)}</strong> <small>USDC</small>
        </span>
        <span>{percentOf(item.progressBps)}%</span>
      </div>
      <Progress label={FUNDING_PROGRESS} percent={barPercent(item.progressBps)} />
      <div className="card-meta">
        <span>of {usdc(item.fundingTarget)} USDC</span>
        <span>{cardMeta(item)}</span>
      </div>
    </CatalogCard>
  );
}

/** C-1: six placeholder cards; no amount is drawn (FR-034 #1). */
export function Skeletons() {
  return (
    <div className="campaign-grid" aria-busy="true" aria-label={LOADING_GRID}>
      {SKELETON_CARDS.map((key) => (
        <div key={key} className="skeleton-card" aria-hidden="true">
          <div className="skeleton image" />
          <div className="skeleton-content">
            <div className="skeleton small" />
            <div className="skeleton title" />
            <div className="skeleton small" />
            <div className="skeleton bar" />
            <div className="skeleton small" />
          </div>
        </div>
      ))}
    </div>
  );
}

type SpeciesSelectProps = {
  /** The species the URL names and the list knows; "" is "All species". */
  value: string;
  species: readonly Species[];
  onChange: (name: string) => void;
};

export function SpeciesSelect({ value, species, onChange }: SpeciesSelectProps) {
  return (
    <label className="select-wrap">
      <Icon name="leaf" size={SELECT_ICON} />
      <select
        aria-label={SPECIES_FILTER_LABEL}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{ALL_SPECIES}</option>
        {species.map(({ code, name }) => (
          <option key={code}>{name}</option>
        ))}
      </select>
      <Icon name="down" size={SMALL_ICON} />
    </label>
  );
}

type RegionFieldProps = {
  /** The region the URL holds. */
  committed: string;
  onCommit: (region: string) => void;
};

/** The text is the field's own; it reaches the URL 300 ms after the last keystroke, "Clear region" at once. */
export function RegionField({ committed, onCommit }: RegionFieldProps) {
  const [typed, setTyped] = useState(committed);
  const [seen, setSeen] = useState(committed);

  // the URL moved on without this field (Clear filters, back button): show what it holds
  if (seen !== committed) {
    setSeen(committed);

    if (typed.trim() !== committed) {
      setTyped(committed);
    }
  }

  useEffect(() => {
    if (typed.trim() === committed) {
      return undefined;
    }

    const timer = setTimeout(() => onCommit(typed.trim()), REGION_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [typed, committed, onCommit]);

  return (
    <label className="region-field">
      <Icon name="pin" size={FIELD_ICON} />
      <input
        aria-label={REGION_FILTER_LABEL}
        placeholder={REGION_PLACEHOLDER}
        maxLength={REGION_MAX_LENGTH}
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
      />
      {typed !== '' && (
        <button
          type="button"
          aria-label={CLEAR_REGION}
          className="clear-region"
          onClick={() => {
            setTyped('');
            onCommit('');
          }}
        >
          <Icon name="close" size={SMALL_ICON} />
        </button>
      )}
    </label>
  );
}

type MessageProps = {
  view: Extract<CatalogView, 'empty' | 'filtered-empty' | 'error'>;
  onClear: () => void;
  onRetry: () => void;
};

/** C-8 / C-9 / C-10 (FR-034). */
export function CatalogMessage({ view, onClear, onRetry }: MessageProps) {
  if (view === 'error') {
    return (
      <EmptyState
        tone="error"
        eyebrow={FAILED_EYEBROW}
        title={FAILED_TITLE}
        description={FAILED_BODY}
      >
        <Button icon="retry" onClick={onRetry}>
          {TRY_AGAIN}
        </Button>
      </EmptyState>
    );
  }

  if (view === 'filtered-empty') {
    return (
      <EmptyState eyebrow={EMPTY_EYEBROW} title={FILTERED_TITLE} description={FILTERED_BODY}>
        <Button icon="arrow" onClick={onClear}>
          {CLEAR_FILTERS}
        </Button>
      </EmptyState>
    );
  }

  return <EmptyState eyebrow={EMPTY_EYEBROW} title={EMPTY_TITLE} description={EMPTY_BODY} />;
}
