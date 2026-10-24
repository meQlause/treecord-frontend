// The four tabs of S27 (s27-campaign-operations.md §3 states 6–21). Each ends in a D14 and a job: nothing on screen changes
// until the job is confirmed and the indexer has mirrored the event (FR-177), so every figure is what the read returned.
import { useState, type ReactNode } from 'react';
import { idempotencyKey } from '../../shared/api/client';
import { tonnes } from '../../shared/format/carbon';
import { usdc } from '../../shared/format/money';
import { Banner } from '../../shared/ui/Banner';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Facts } from '../../shared/ui/Facts';
import { Field } from '../../shared/ui/Field';
import { Lorem } from '../../shared/ui/Lorem';
import { Skeleton } from '../../shared/ui/Skeleton';
import { D14, fieldProblem, fieldText, useConfirm, useReviewKey } from './operations.action';
import { post, useCampaignBatches, type Batch, type OperatorCampaign } from './operations.api';
import * as copy from './operations.copy';
import { useJsonDraft } from './operations.draft';
import {
  countOk,
  currentYear,
  issuanceBody,
  issuanceOk,
  maxCount,
  percentOfBps,
  plainNumber,
  priceOk,
  toUsdcBaseUnits,
  walletOk,
  type Issuance,
} from './operations.rules';

export type TabProps = {
  data: OperatorCampaign;
  online: boolean;
  onQueued: (id: string) => void;
  /** Re-reads every operator read of this page (the read model, the batches). */
  onRefetch: () => void;
};

const rule = (label: string, id: string) => (
  <>
    {label} · <Lorem id={id} kind="label" />
  </>
);

const NOT_ACTIVE = { banner: copy.MUST_BE_ACTIVE, blocking: true, refetch: true } as const;

const ANCHOR_ERRORS = {
  validation_error: fieldProblem,
  campaign_not_active: NOT_ACTIVE,
  not_enough_slots: { field: { name: 'count', text: <Lorem id="COPY-013" /> }, refetch: true },
} as const;

export function AnchorTab({ data, online, onQueued, onRefetch }: TabProps) {
  const [wallet, setWallet] = useState('');
  const [count, setCount] = useState('1');
  const keyFor = useReviewKey('s27-anchor-');
  const action = useConfirm(ANCHOR_ERRORS, onRefetch);
  const { address, status } = data.campaign;
  const { availableSlots, rolledOverOpenSlots } = data.anchor;
  const active = status === 'active';
  const body = { planter: wallet, count: Number(count) };

  const write = async (): Promise<void> => {
    const { job } = await post(
      `/operator/campaigns/${address}/anchor-assignments`,
      body,
      keyFor(JSON.stringify(body)),
    );

    onQueued(job.id);
  };

  return (
    <>
      <Facts
        rows={[
          [copy.F_AVAILABLE, String(availableSlots)],
          [copy.F_ROLLED, rolledOverOpenSlots === null ? copy.DASH : String(rolledOverOpenSlots)],
        ]}
      />
      <Field
        label={rule(copy.F_WALLET, copy.RULE_COPY.wallet)}
        error={fieldText(action.problem, 'planter')}
      >
        <input
          value={wallet}
          placeholder="0x…"
          onChange={(event) => {
            setWallet(event.target.value);
            action.clear();
          }}
        />
      </Field>
      <Field
        label={rule(copy.F_COUNT, copy.RULE_COPY.count)}
        error={fieldText(action.problem, 'count')}
      >
        <input
          type="number"
          min={1}
          max={maxCount(availableSlots)}
          step={1}
          value={count}
          onChange={(event) => {
            setCount(event.target.value);
            action.clear();
          }}
        />
      </Field>
      <D14
        label={copy.ASSIGN}
        summary={copy.assignSummary(count, wallet)}
        disabled={!online || !active || !walletOk(wallet) || !countOk(count, availableSlots)}
        problem={action.problem}
        onConfirm={() => action.confirm(write)}
      />
      {!active && <p className="op-line">{copy.MUST_BE_ACTIVE}</p>}
    </>
  );
}

const ESTIMATE_ERRORS = {
  campaign_not_active: NOT_ACTIVE,
  estimate_locked: { banner: copy.ESTIMATE_LOCKED, blocking: true, refetch: true },
  species_unknown: {
    banner: <Lorem id={copy.SPECIES_UNKNOWN_COPY} />,
    blocking: true,
    refetch: true,
  },
} as const;

type Estimate = OperatorCampaign['estimate'];

const rateText = (estimate: Estimate): string =>
  estimate.kgCo2PerYearMature === null || estimate.yearsToMaturity === null
    ? copy.DASH
    : copy.rateOf(plainNumber(estimate.kgCo2PerYearMature), estimate.yearsToMaturity);

const perTreeText = (estimate: Estimate): string =>
  estimate.kgPerTree === null || estimate.averageMaturityBps === null
    ? copy.DASH
    : copy.perTreeOf(estimate.kgPerTree, percentOfBps(estimate.averageMaturityBps));

const currentText = ({ current }: Estimate): string =>
  current === null ? copy.NOT_COMPUTED : copy.estimateOf(tonnes(current.amount), current.label);

const estimateRows = (estimate: Estimate): [string, string][] => [
  [copy.F_METHOD, estimate.method],
  [copy.F_SPECIES, estimate.species?.name ?? copy.DASH],
  [copy.F_TREES, String(estimate.treeCount)],
  [copy.F_COMMITMENT, copy.monthsOf(estimate.commitmentMonths)],
  [copy.F_RATE, rateText(estimate)],
  [copy.F_PER_TREE, perTreeText(estimate)],
  [copy.F_CURRENT, currentText(estimate)],
];

const cannotCompute = ({ campaign, estimate }: OperatorCampaign, online: boolean): boolean =>
  !online || campaign.status !== 'active' || estimate.locked || estimate.species === null;

export function EstimateTab({ data, online, onQueued, onRefetch }: TabProps) {
  const keyFor = useReviewKey('s27-estimate-');
  const action = useConfirm(ESTIMATE_ERRORS, onRefetch);
  const { estimate, campaign } = data;

  const write = async (): Promise<void> => {
    const { job } = await post(
      `/operator/campaigns/${campaign.address}/estimate`,
      {},
      keyFor('{}'),
    );

    onQueued(job.id);
  };

  return (
    <>
      <Facts rows={estimateRows(estimate)} />
      <p>{copy.ESTIMATE_TEXT}</p>
      <D14
        label={copy.COMPUTE}
        disabled={cannotCompute(data, online)}
        problem={action.problem}
        onConfirm={() => action.confirm(write)}
      />
      {estimate.locked && <p className="op-line">{copy.ESTIMATE_LOCKED}</p>}
      {estimate.species === null && (
        <p className="op-line">
          <Lorem id={copy.SPECIES_UNKNOWN_COPY} />
        </p>
      )}
    </>
  );
}

const ISSUANCE_ERRORS = {
  validation_error: fieldProblem,
  campaign_not_issuable: { banner: <Lorem id="COPY-018" />, blocking: true, refetch: true },
} as const;

type Edit = (patch: Partial<Issuance>) => void;

function IssuanceFields({
  value,
  edit,
  error,
}: {
  value: Issuance;
  edit: Edit;
  error: (name: string) => ReactNode;
}) {
  return (
    <div className="ws-form-grid op-form-grid">
      <Field label={rule(copy.F_REGISTRY, copy.RULE_COPY.registry)} error={error('registry')}>
        <input
          minLength={2}
          maxLength={64}
          value={value.registry}
          onChange={(event) => edit({ registry: event.target.value })}
        />
      </Field>
      <Field label={rule(copy.F_VINTAGE, copy.RULE_COPY.vintage)} error={error('vintage')}>
        <input
          type="number"
          min={2000}
          max={2100}
          value={value.vintage}
          onChange={(event) => edit({ vintage: event.target.value })}
        />
      </Field>
      <Field label={rule(copy.F_SERIAL_START, copy.RULE_COPY.serial)} error={error('serialStart')}>
        <input
          maxLength={200}
          value={value.serialStart}
          onChange={(event) => edit({ serialStart: event.target.value })}
        />
      </Field>
      <Field label={rule(copy.F_SERIAL_END, copy.RULE_COPY.serial)} error={error('serialEnd')}>
        <input
          maxLength={200}
          value={value.serialEnd}
          onChange={(event) => edit({ serialEnd: event.target.value })}
        />
      </Field>
      <Field label={rule(copy.F_TONNES, copy.RULE_COPY.tonnes)} error={error('tonnes')}>
        <input
          inputMode="decimal"
          value={value.tonnes}
          onChange={(event) => edit({ tonnes: event.target.value })}
        />
      </Field>
    </div>
  );
}

const KEY_PREFIX = 's27-issue-';

export function IssuanceTab({ data, online, onQueued, onRefetch }: TabProps) {
  const { address, status } = data.campaign;
  const draft = useJsonDraft<Issuance>('s27-issuance', address, {
    registry: '',
    vintage: currentYear(),
    serialStart: '',
    serialEnd: '',
    tonnes: '',
    key: null,
  });
  const action = useConfirm(ISSUANCE_ERRORS, onRefetch);
  const { value } = draft;
  const edit: Edit = (patch) => {
    draft.patch(patch);
    action.clear();
  };

  // the key is stored before the request, so a retry or a reload sends the same one until a 2xx (s27 §2.3)
  const write = async (): Promise<void> => {
    const key = value.key ?? `${KEY_PREFIX}${idempotencyKey()}`;

    draft.patch({ key });

    const { job } = await post(
      `/operator/campaigns/${address}/issuances`,
      issuanceBody(value),
      key,
    );

    draft.clear();
    onQueued(job.id);
  };

  const confirm = (): Promise<boolean> =>
    action.confirm(write, (problem) => {
      if (problem.dropKey === true) {
        draft.patch({ key: null });
      }
    });

  return (
    <>
      <p>{copy.ISSUANCE_TEXT}</p>
      <IssuanceFields value={value} edit={edit} error={(name) => fieldText(action.problem, name)} />
      <D14
        label={copy.MIRROR}
        summary={copy.mirrorSummary(value.tonnes, value.registry, value.vintage)}
        disabled={!online || !['active', 'completed'].includes(status) || !issuanceOk(value)}
        problem={action.problem}
        onConfirm={confirm}
      />
    </>
  );
}

const PRICE_ERRORS = {
  validation_error: fieldProblem,
  not_found: { banner: copy.BATCH_NOT_FOUND, blocking: true, refetch: true },
} as const;

const priceText = (batch: Batch): string =>
  batch.usdcPerTonne === null ? copy.NOT_SET : copy.priceOf(usdc(batch.usdcPerTonne));

function PriceForm({
  batch,
  online,
  onQueued,
  onRefetch,
}: Omit<TabProps, 'data'> & { batch: Batch }) {
  const draft = useJsonDraft('s27-price', batch.batchId, { price: '' });
  const keyFor = useReviewKey(`s27-price-${batch.batchId}-`);
  const action = useConfirm(PRICE_ERRORS, onRefetch);
  const { price } = draft.value;

  const write = async (): Promise<void> => {
    const body = { usdcPerTonne: toUsdcBaseUnits(price) };
    const { job } = await post(
      `/operator/carbon/batches/${batch.batchId}/price`,
      body,
      keyFor(JSON.stringify(body)),
    );

    draft.clear();
    onQueued(job.id);
  };

  return (
    <>
      <Facts
        rows={[
          [copy.F_PRICE_NOW, priceText(batch)],
          [copy.F_INVENTORY, copy.inventoryOf(tonnes(batch.inventoryAmount))],
        ]}
      />
      <Field
        label={copy.F_PRICE_ASK}
        hint={copy.PRICE_HINT}
        error={fieldText(action.problem, 'usdcPerTonne')}
      >
        <input
          inputMode="decimal"
          value={price}
          onChange={(event) => {
            draft.patch({ price: event.target.value });
            action.clear();
          }}
        />
      </Field>
      <D14
        label={copy.SET_PRICE}
        summary={copy.priceSummary(price)}
        disabled={!online || !priceOk(price)}
        problem={action.problem}
        onConfirm={() => action.confirm(write)}
      />
    </>
  );
}

export function PriceTab({ data, online, onQueued, onRefetch }: TabProps) {
  const batches = useCampaignBatches(data.campaign.address);
  const [chosen, setChosen] = useState('');
  const items = batches.data;

  if (batches.isError) {
    return (
      <Banner tone="error" action={copy.TRY_AGAIN} onAction={() => void batches.refetch()}>
        {copy.UNAVAILABLE}
      </Banner>
    );
  }

  if (items === undefined) {
    return <Skeleton shape="region" label={copy.LOADING_BATCHES} />;
  }

  const batch = items.find(({ batchId }) => batchId === chosen) ?? items[0];

  if (batch === undefined) {
    return <EmptyState variant="compact" title={copy.NO_BATCHES} />;
  }

  return (
    <>
      <Field label={copy.F_BATCH}>
        <select value={batch.batchId} onChange={(event) => setChosen(event.target.value)}>
          {items.map(({ batchId, registry, vintage }) => (
            <option key={batchId} value={batchId}>
              {copy.batchOption(batchId, registry, vintage)}
            </option>
          ))}
        </select>
      </Field>
      <PriceForm
        key={batch.batchId}
        batch={batch}
        online={online}
        onQueued={onQueued}
        onRefetch={onRefetch}
      />
    </>
  );
}
