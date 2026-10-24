// S07's pieces (s07-carbon.md §1): the batch card, the two secondary filters and the empty / error state.
import { Icon } from '../../shared/art/Icon';
import { Button } from '../../shared/ui/Button';
import { CatalogCard } from '../../shared/ui/CatalogCard';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Progress } from '../../shared/ui/Progress';
import { tonnes } from '../../shared/format/carbon';
import { CreditArt } from './art/CreditArt';
import type { CarbonBatch } from './carbon.api';
import {
  ALL_REGISTRIES,
  AVAILABLE_UNIT,
  CLEAR_FILTERS,
  CLEAR_SEARCH,
  EMPTY_TITLE,
  FAILED_TITLE,
  FILTERED_TITLE,
  INVENTORY_PROGRESS,
  ISSUED,
  QUERY_FILTER_LABEL,
  QUERY_PLACEHOLDER,
  REGISTRY_FILTER_LABEL,
  TRY_AGAIN,
  VIEW_BATCH,
  batchTag,
  issuedLine,
  viewBatchLabel,
  vintageLine,
} from './carbon.copy';
import { priceLine, sharePercent, type CatalogView } from './carbon.rules';

const SMALL_ICON = 14;
const CLEAR_ICON = 13;
const FIELD_ICON = 16;
const SELECT_ICON = 17;
const CARD_ICON = 17;

/** `carbon.jsx:106`: one batch. The server's order and its `availability` are used as sent. */
export function BatchCard({ batch, index }: { batch: CarbonBatch; index: number }) {
  const { batchId, campaign, registry, vintage, issuedAmount, inventoryAmount } = batch;
  const share = sharePercent(batch);

  return (
    <CatalogCard
      index={index}
      className="cb-batch-card"
      to={`/carbon/${batchId}`}
      art={<CreditArt batch={batch} />}
      tags={
        <>
          <span className="badge funding">
            <span />
            {ISSUED}
          </span>
          <span className="species-label">{batchTag(batchId)}</span>
        </>
      }
      location={campaign.region}
      title={campaign.title}
      cta={VIEW_BATCH}
      ctaLabel={viewBatchLabel(batchId, campaign.title)}
    >
      <div className="tree-target">
        <Icon name="carbon" size={CARD_ICON} />
        <strong>{registry}</strong>
        <span className="dot-separator">·</span>
        {vintageLine(vintage)}
      </div>
      <div className="funding-row">
        <span>
          <strong>{tonnes(inventoryAmount)}</strong> <small>{AVAILABLE_UNIT}</small>
        </span>
        <span>{share}%</span>
      </div>
      <Progress label={INVENTORY_PROGRESS} percent={share} />
      <div className="card-meta">
        <span>{issuedLine(tonnes(issuedAmount))}</span>
        <span>{priceLine(batch)}</span>
      </div>
    </CatalogCard>
  );
}

type RegistrySelectProps = {
  /** The registry the URL names and the list holds; "" is "All registries". */
  value: string;
  registries: readonly string[];
  onChange: (registry: string) => void;
};

export function RegistrySelect({ value, registries, onChange }: RegistrySelectProps) {
  return (
    <label className="select-wrap">
      <Icon name="carbon" size={SELECT_ICON} />
      <select
        aria-label={REGISTRY_FILTER_LABEL}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{ALL_REGISTRIES}</option>
        {registries.map((registry) => (
          <option key={registry}>{registry}</option>
        ))}
      </select>
      <Icon name="down" size={SMALL_ICON} />
    </label>
  );
}

type QueryFieldProps = { value: string; onChange: (query: string) => void };

export function QueryField({ value, onChange }: QueryFieldProps) {
  return (
    <label className="region-field">
      <Icon name="pin" size={FIELD_ICON} />
      <input
        aria-label={QUERY_FILTER_LABEL}
        placeholder={QUERY_PLACEHOLDER}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value !== '' && (
        <button
          type="button"
          aria-label={CLEAR_SEARCH}
          className="clear-region"
          onClick={() => onChange('')}
        >
          <Icon name="close" size={SMALL_ICON} />
        </button>
      )}
    </label>
  );
}

/** The "Clear filters" text button of the results row. */
export function ClearFilters({ onClear }: { onClear: () => void }) {
  return (
    <button type="button" className="text-button" onClick={onClear}>
      {CLEAR_FILTERS}
      <Icon name="close" size={CLEAR_ICON} />
    </button>
  );
}

type MessageProps = {
  view: Extract<CatalogView, 'empty' | 'filtered-empty' | 'error'>;
  onClear: () => void;
  onRetry: () => void;
};

/** States 3, 4 and 6 (FR-220). */
export function CatalogMessage({ view, onClear, onRetry }: MessageProps) {
  if (view === 'error') {
    return (
      <EmptyState tone="error" title={FAILED_TITLE}>
        <Button icon="retry" onClick={onRetry}>
          {TRY_AGAIN}
        </Button>
      </EmptyState>
    );
  }

  if (view === 'filtered-empty') {
    return (
      <EmptyState icon="leaf" title={FILTERED_TITLE}>
        <Button variant="outline" onClick={onClear}>
          {CLEAR_FILTERS}
        </Button>
      </EmptyState>
    );
  }

  return <EmptyState icon="leaf" title={EMPTY_TITLE} />;
}
