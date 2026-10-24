// S17 Unplanted slots (s17-slots.md): the planter's claimed and assigned slots with no tree yet, each with its own campaign
// and the tag the server issued, a printable tag card and "Record planting". Tags are never made in the browser
// (FR-086). One read, no cursor; the filter runs over the whole list. It lives in the workspace frame.
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'motion/react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, useSearchParams } from 'react-router';
import { PrintQR } from '../../shared/art/QR';
import { number } from '../../shared/format/number';
import { Banner } from '../../shared/ui/Banner';
import { Button } from '../../shared/ui/Button';
import { CatalogCard } from '../../shared/ui/CatalogCard';
import { CatalogSection } from '../../shared/ui/CatalogSection';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Grid } from '../../shared/ui/Grid';
import { Lorem } from '../../shared/ui/Lorem';
import { PageHead } from '../../shared/ui/PageHead';
import { Skeleton } from '../../shared/ui/Skeleton';
import { ErrorView } from '../../app/states/states';
import { LOADING } from '../../app/states/states.copy';
import { ApiError } from '../../shared/api/errors';
import { usePlanterSlots, type PlanterSlot } from './planter.api';
import {
  BROWSE_CAMPAIGNS,
  CLAIM_MORE,
  CLEAR_FILTERS,
  NO_MATCHING_SLOTS_COPY,
  NO_SLOTS,
  PRINT_TAG,
  RECORD_PLANTING,
  SLOTS_CATALOG,
  SLOTS_COORD,
  SLOTS_EM,
  SLOTS_EYEBROW,
  SLOTS_KICKER,
  SLOTS_LINE,
  SLOT_BADGE,
  SLOT_BADGE_CLASS,
  SLOT_FILTERS,
  SLOT_FILTERS_LABEL,
  TO_PLANT,
  TRY_AGAIN,
  WALLET_WAIT,
  printLine,
  radiusLabel,
  slotCount,
  slotKind,
  slotNumber,
  tagLine,
} from './planter.copy';
import { filterSlots, parseSlotFilter, plantingLink, slotFilterParam } from './planter.rules';
import { PlotArt, PlotCardArt } from './slots.art';

const PLANT_ICON = 'tree';

function SlotCard({ slot, index }: { slot: PlanterSlot; index: number }) {
  const { campaign, slotId, tag } = slot;
  const code = tag?.code ?? null;

  return (
    <CatalogCard
      index={index}
      to={plantingLink(slot)}
      art={<PlotCardArt kind={slot.kind} tag={code} />}
      tags={
        <>
          <span className={`badge ${SLOT_BADGE_CLASS[slot.status]}`}>
            <span />
            {SLOT_BADGE[slot.status]}
          </span>
          <span className="species-label">{slotKind(slot.kind)}</span>
        </>
      }
      location={campaign.regionName}
      title={slotNumber(slotId)}
      cta={RECORD_PLANTING}
      ctaLabel={RECORD_PLANTING}
      ctaIcon={PLANT_ICON}
    >
      <div className="tree-target">
        <span className="clamp-2" title={campaign.title}>
          {campaign.title}
        </span>
      </div>
      <div className="funding-row">
        <span>
          <strong>{campaign.speciesName}</strong> <small>{TO_PLANT}</small>
        </span>
        <span>{radiusLabel(number(campaign.regionRadiusM))}</span>
      </div>
      <div className="card-meta">
        <span>{tagLine(code)}</span>
        {code !== null && (
          <PrintQR text={code} line={printLine(slotId, campaign.title)}>
            {PRINT_TAG}
          </PrintQR>
        )}
      </div>
    </CatalogCard>
  );
}

function Empty({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  if (filtered) {
    return (
      <EmptyState
        variant="compact"
        icon="leaf"
        title={<Lorem id={NO_MATCHING_SLOTS_COPY} kind="label" />}
      >
        <Button variant="outline" onClick={onClear}>
          {CLEAR_FILTERS}
        </Button>
      </EmptyState>
    );
  }

  return (
    <EmptyState variant="compact" icon="leaf" title={NO_SLOTS}>
      <Link to="/campaigns">{BROWSE_CAMPAIGNS}</Link>
    </EmptyState>
  );
}

export function Component() {
  const [params, setParams] = useSearchParams();
  const filter = parseSlotFilter(params.get('filter'));
  const slots = usePlanterSlots();
  const queryClient = useQueryClient();
  const all = slots.data ?? [];
  const shown = filterSlots(all, filter);
  const pick = (next: string): void => {
    const value = slotFilterParam(next);

    setParams(value === undefined ? {} : { filter: value }, { replace: true });
  };

  const head = (
    <PageHead
      className="pl-heading"
      eyebrow={SLOTS_EYEBROW}
      title={SLOTS_LINE}
      em={SLOTS_EM}
      art={<PlotArt />}
      coord={SLOTS_COORD}
    />
  );

  if (slots.isError) {
    const walletMissing = slots.error instanceof ApiError && slots.error.code === 'wallet_missing';

    return (
      <>
        {head}
        {walletMissing ? (
          <Banner tone="callout" action={TRY_AGAIN} onAction={() => void slots.refetch()}>
            {WALLET_WAIT}
          </Banner>
        ) : (
          <ErrorView
            error={slots.error}
            onRetry={() => void queryClient.invalidateQueries({ queryKey: ['planter', 'slots'] })}
          />
        )}
      </>
    );
  }

  if (slots.data === undefined) {
    return <Skeleton shape="list" label={LOADING} />;
  }

  return (
    <>
      {head}
      <CatalogSection
        className="pl-catalog"
        title={SLOTS_CATALOG}
        kicker={SLOTS_KICKER}
        filters={SLOT_FILTERS}
        filtersLabel={SLOT_FILTERS_LABEL}
        value={filter}
        onChange={pick}
        meta={slotCount(shown.length, all.length)}
        aside={
          <span className="newest-label">
            <Link to="/campaigns">{CLAIM_MORE}</Link>
          </span>
        }
      >
        {shown.length === 0 ? (
          <Empty filtered={filter !== 'All'} onClear={() => pick('All')} />
        ) : (
          <Grid>
            <AnimatePresence mode="popLayout">
              {shown.map((slot, index) => (
                <SlotCard key={slot.slotId} slot={slot} index={index} />
              ))}
            </AnimatePresence>
          </Grid>
        )}
      </CatalogSection>
    </>
  );
}
