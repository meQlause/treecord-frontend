// S14's pieces (s14-create-campaign.md §1): the three steps, the preview and the complete state. Each takes the draft, its
// errors and a setter; the page owns the draft, the step and the submit stage. Markup and class names are the mockup's.
import { useEffect, useRef, type ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { Icon } from '../../shared/art/Icon';
import { Landscape } from '../../shared/art/Landscape';
import { localDateTime, localZone } from '../../shared/format/datetime';
import { Banner } from '../../shared/ui/Banner';
import { Lorem } from '../../shared/ui/Lorem';
import { artForSpecies } from './art';
import type { Species } from './campaigns.api';
import { usdc } from './campaigns.rules';
import * as copy from './create.copy';
import {
  amountsOf,
  openShare,
  totalShare,
  units,
  type Draft,
  type Errors,
  type Step,
} from './create.rules';

const BIG_ICON = 35;
const ARROW = 17;
const SMALL = 14;
const HEADING_ICON = 18;
const PERCENT = 100;
const TEXT_ROWS = 3;

export type Form = {
  draft: Draft;
  errors: Errors;
  set: (key: Exclude<keyof Draft, 'splits'>, value: string) => void;
  setSplit: (index: number, value: string) => void;
};

type FieldProps = {
  form: Form;
  name: Exclude<keyof Draft, 'splits'>;
  label: ReactNode;
  type?: string;
  wide?: boolean;
  optional?: boolean;
  placeholder?: string;
  hint?: ReactNode;
  step?: string;
  area?: boolean;
};

const describedBy = (name: string, hint: boolean, error: boolean): string | undefined =>
  [hint ? `hint-${name}` : '', error ? `error-${name}` : ''].filter(Boolean).join(' ') || undefined;

function Control({ form, name, type = 'text', placeholder, hint, step, area }: FieldProps) {
  const error = form.errors[name];
  const shared = {
    id: `cc-${name}`,
    value: form.draft[name],
    onChange: (event: { target: { value: string } }) => form.set(name, event.target.value),
    'aria-invalid': error !== undefined,
    'aria-describedby': describedBy(name, hint !== undefined, error !== undefined),
  };

  return area === true ? (
    <textarea {...shared} rows={TEXT_ROWS} />
  ) : (
    <input {...shared} type={type} step={step ?? 'any'} placeholder={placeholder} />
  );
}

function Field(props: FieldProps) {
  const { form, name, label, wide, optional, hint } = props;
  const error = form.errors[name];

  return (
    <label className={`cc-field ${wide === true ? 'cc-wide' : ''}`.trim()} htmlFor={`cc-${name}`}>
      <span>
        {label}
        {optional === true && <small>{copy.OPTIONAL}</small>}
      </span>
      <Control {...props} />
      {hint !== undefined && (
        <small className="cc-hint" id={`hint-${name}`}>
          {hint}
        </small>
      )}
      {error !== undefined && (
        <small className="cc-error" id={`error-${name}`}>
          {error}
        </small>
      )}
    </label>
  );
}

export type SpeciesRead = {
  items: Species[] | undefined;
  failed: boolean;
  retry: () => void;
};

function SpeciesField({ form, species }: { form: Form; species: SpeciesRead }) {
  const error = form.errors.species;

  if (species.failed) {
    return (
      <div className="cc-field">
        <span>{copy.F_SPECIES}</span>
        <Banner tone="error" action={copy.TRY_AGAIN} onAction={species.retry}>
          {copy.UNAVAILABLE}
        </Banner>
      </div>
    );
  }

  return (
    <label className="cc-field" htmlFor="cc-species">
      <span>{copy.F_SPECIES}</span>
      <select
        id="cc-species"
        value={form.draft.species}
        disabled={species.items === undefined}
        aria-busy={species.items === undefined || undefined}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy('species', false, error !== undefined)}
        onChange={(event) => form.set('species', event.target.value)}
      >
        {species.items?.map(({ code, name }) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
      {error !== undefined && (
        <small className="cc-error" id="error-species">
          {error}
        </small>
      )}
    </label>
  );
}

function Urls({ form }: { form: Form }) {
  const box = useRef<HTMLDetailsElement>(null);
  const failed = form.errors.urls !== undefined;

  // an Image URLs error never hides in the closed <details>
  useEffect(() => {
    if (failed && box.current !== null) {
      box.current.open = true;
    }
  }, [failed]);

  return (
    <details className="cc-optional" ref={box}>
      <summary>
        {copy.URLS_SUMMARY}
        <Icon name="down" size={SMALL} />
      </summary>
      <Field form={form} name="urls" label={copy.F_URLS} optional area />
      <p>{copy.URLS_NOTE}</p>
    </details>
  );
}

export function InfoStep({ form, species }: { form: Form; species: SpeciesRead }) {
  return (
    <>
      <div className="cc-grid">
        <Field
          form={form}
          name="title"
          label={copy.F_TITLE}
          wide
          placeholder={copy.TITLE_PLACEHOLDER}
        />
        <SpeciesField form={form} species={species} />
        <Field
          form={form}
          name="region"
          label={copy.F_REGION}
          placeholder={copy.REGION_PLACEHOLDER}
        />
        <Field form={form} name="description" label={copy.F_DESCRIPTION} wide optional area />
      </div>
      <h3 className="cc-subheading">
        <Icon name="pin" size={HEADING_ICON} />
        {copy.AREA}
      </h3>
      <div className="cc-grid">
        <Field
          form={form}
          name="lat"
          label={copy.F_LAT}
          type="number"
          placeholder={copy.LAT_PLACEHOLDER}
        />
        <Field
          form={form}
          name="lon"
          label={copy.F_LON}
          type="number"
          placeholder={copy.LON_PLACEHOLDER}
        />
        <Field form={form} name="radius" label={copy.F_RADIUS} type="number" step="1" />
      </div>
      <Urls form={form} />
    </>
  );
}

function BudgetInputs({ form }: { form: Form }) {
  const amounts = amountsOf(units(form.draft.target), form.draft.splits);

  return (
    <>
      <div className="cc-budget-inputs">
        {copy.BUDGET_ROWS.map((label, index) => (
          <label key={label}>
            <span>{label}</span>
            <div>
              <input
                aria-label={copy.percentLabel(label)}
                aria-invalid={form.errors.splits !== undefined}
                inputMode="decimal"
                value={form.draft.splits[index] ?? ''}
                onChange={(event) => form.setSplit(index, event.target.value)}
              />
              <span>%</span>
            </div>
            <small>
              {usdc(amounts[index] ?? BigInt(0))} {copy.USDC}
            </small>
          </label>
        ))}
      </div>
      {form.errors.splits !== undefined && (
        <p className="cc-error" role="alert">
          {form.errors.splits}
        </p>
      )}
      <p className="cc-hint">{copy.totalLine(totalShare(form.draft.splits))}</p>
    </>
  );
}

export function FundingStep({ form, operator }: { form: Form; operator: boolean }) {
  return (
    <>
      <div className="cc-grid">
        {operator && (
          <Field
            form={form}
            name="creator"
            label={<Lorem id={copy.CREATOR_LABEL} kind="label" />}
            wide
            placeholder="0x…"
            hint={<Lorem id={copy.CREATOR_HINT} />}
          />
        )}
        <Field form={form} name="target" label={copy.F_TARGET} />
        <Field form={form} name="trees" label={copy.F_TREES} type="number" step="1" />
        <Field form={form} name="months" label={copy.F_MONTHS} type="number" step="1" />
        <Field form={form} name="cap" label={copy.F_CAP} type="number" step="1" />
        <Field form={form} name="anchor" label={copy.F_ANCHOR} />
        <div className="cc-field cc-readonly">
          <span>{copy.F_OPEN}</span>
          <strong>{openShare(form.draft.anchor)}</strong>
        </div>
      </div>
      <h3 className="cc-subheading">
        <Icon name="clock" size={HEADING_ICON} />
        {copy.SCHEDULE}
      </h3>
      <p className="cc-hint">{copy.localTimeHint(localZone())}</p>
      <div className="cc-grid">
        <Field form={form} name="funding" label={copy.F_FUNDING} type="datetime-local" />
        <Field form={form} name="claim" label={copy.F_CLAIM} type="datetime-local" />
      </div>
      <h3 className="cc-subheading">
        <Icon name="wallet" size={HEADING_ICON} />
        {copy.BUDGET}
      </h3>
      <BudgetInputs form={form} />
    </>
  );
}

type Row = readonly [label: ReactNode, value: ReactNode];

function ReviewSection({ title, edit, rows }: { title: string; edit: () => void; rows: Row[] }) {
  return (
    <section className="cc-review">
      <div>
        <h3>{title}</h3>
        <button type="button" className="text-button" onClick={edit}>
          {copy.EDIT}
          <Icon name="arrow" size={SMALL} />
        </button>
      </div>
      <dl>
        {rows.map(([label, value], index) => (
          <div key={index}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const when = (text: string): string => localDateTime(Date.parse(text));

/** The reviewed form's "Campaign information" rows: the optional ones only when something was typed. */
const infoRows = (draft: Draft, speciesName: string): Row[] => [
  [copy.R_TITLE, draft.title],
  [copy.F_SPECIES, speciesName],
  [copy.F_REGION, draft.region],
  [copy.R_AREA, `${draft.lat}, ${draft.lon}`],
  [copy.R_RADIUS, `${draft.radius} m`],
  ...(draft.description === '' ? [] : [[copy.F_DESCRIPTION, draft.description] as Row]),
  ...(draft.urls.trim() === '' ? [] : [[copy.R_URLS, draft.urls] as Row]),
];

const fundingRows = (draft: Draft, operator: boolean): Row[] => [
  [copy.R_TARGET, `${usdc(units(draft.target) ?? BigInt(0))} ${copy.USDC}`],
  [copy.F_TREES, Number(draft.trees).toLocaleString()],
  [copy.R_COMMITMENT, copy.monthsOf(draft.months)],
  [copy.R_ANCHOR, `${draft.anchor}% / ${PERCENT - Number(draft.anchor)}%`],
  [copy.F_CAP, draft.cap],
  [copy.F_FUNDING, when(draft.funding)],
  [copy.F_CLAIM, when(draft.claim)],
  ...(operator
    ? [[<Lorem key="creator" id={copy.CREATOR_LABEL} kind="label" />, draft.creator] as Row]
    : []),
];

type ReviewProps = {
  draft: Draft;
  speciesName: string;
  operator: boolean;
  goTo: (step: Step) => void;
};

export function ReviewStep({ draft, speciesName, operator, goTo }: ReviewProps) {
  const amounts = amountsOf(units(draft.target), draft.splits);

  return (
    <>
      <ReviewSection
        title={copy.REVIEW_INFO}
        edit={() => goTo(0)}
        rows={infoRows(draft, speciesName)}
      />
      <ReviewSection
        title={copy.REVIEW_FUNDING}
        edit={() => goTo(1)}
        rows={fundingRows(draft, operator)}
      />
      <div className="cc-review-budget">
        <h3>{copy.BUDGET}</h3>
        {copy.BUDGET_ROWS.map((label, index) => (
          <div key={label}>
            <span>{label}</span>
            <span>{draft.splits[index]}%</span>
            <strong>
              {usdc(amounts[index] ?? BigInt(0))} {copy.USDC}
            </strong>
          </div>
        ))}
      </div>
      <div className="cc-milestones">
        <h3>{copy.MILESTONES}</h3>
        <div>
          {copy.MILESTONE_ROWS.map(([label, percent]) => (
            <span key={label}>
              <small>{label}</small>
              <strong>{percent}</strong>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

/** CC-6: what the campaign will look like, from whatever has been typed so far. */
export function Preview({ draft, speciesName }: { draft: Draft; speciesName: string }) {
  const target = units(draft.target);

  return (
    <aside className="cc-preview">
      <div className="cc-preview-art">
        <Landscape hero kind={artForSpecies(draft.species)} />
      </div>
      <div className="cc-preview-body">
        <span className="eyebrow">{copy.PREVIEW}</span>
        <h2>{draft.title.trim() || copy.NEXT_FOREST}</h2>
        <span className="location wrap-any">
          <Icon name="pin" size={SMALL} />
          {draft.region.trim() || copy.CHOOSE_REGION}
        </span>
        <div className="cc-preview-facts">
          <div>
            <span>{copy.R_TARGET}</span>
            <strong>
              {target === null ? '—' : usdc(target)} <small>{copy.USDC}</small>
            </strong>
          </div>
          <div>
            <span>{copy.F_TREES}</span>
            <strong>
              {/^\d+$/u.test(draft.trees) ? Number(draft.trees).toLocaleString() : '—'}
            </strong>
          </div>
          <div>
            <span>{copy.F_SPECIES}</span>
            <strong>{speciesName}</strong>
          </div>
          <div>
            <span>{copy.R_COMMITMENT}</span>
            <strong>{draft.months === '' ? '—' : copy.monthsOf(draft.months)}</strong>
          </div>
        </div>
        <div className="cc-preview-note">
          <Icon name="leaf" size={HEADING_ICON} />
          <span>{copy.PREVIEW_NOTE}</span>
        </div>
      </div>
    </aside>
  );
}

type CompleteProps = { title: string; address: string; onBack: () => void };

/** CC-13: after the indexer knows the address, and only then. */
export function Complete({ title, address, onBack }: CompleteProps) {
  return (
    <section className="cc-complete" role="status">
      <span className="cc-success-icon">
        <Icon name="check" size={BIG_ICON} />
      </span>
      <span className="eyebrow">{copy.COMPLETE_EYEBROW}</span>
      <h2>{copy.COMPLETE_TITLE}</h2>
      <p>{title}</p>
      <p>{copy.COMPLETE_LINE}</p>
      <Link className="button primary" to={`/campaigns/${address}`}>
        {copy.VIEW_CAMPAIGN}
        <Icon name="arrow" size={ARROW} />
      </Link>
      <Link className="button outline" to="/app/donor">
        {copy.BACK_TO_DONOR}
        <Icon name="arrow" size={ARROW} />
      </Link>
      <button type="button" className="text-button" onClick={onBack}>
        {copy.BACK_TO_REVIEW}
      </button>
    </section>
  );
}
