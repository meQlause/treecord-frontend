// S14 Create campaign (s14-create-campaign.md): a three-step wizard with a live preview. "Create campaign" saves the metadata,
// preflights the config, sends `CampaignFactory.createCampaign` from the creator's wallet and shows the complete state only once
// the API knows the new address (no optimistic UI, FR-079). One submit in flight (NFR-054): a ref lock, set at the first press.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useToast } from '../../app/shell/toast-context';
import { config } from '../../app/session/config';
import { ME_KEY } from '../../app/session/use-me';
import { useSession, type Profile } from '../../app/session/session';
import { Icon, type IconName } from '../../shared/art/Icon';
import {
  actingChainId,
  actingFactory,
  actingTimeUnit,
  useChainSession,
} from '../../shared/chain/wallet';
import { Banner } from '../../shared/ui/Banner';
import { Lorem } from '../../shared/ui/Lorem';
import { useSpecies } from './campaigns.api';
import * as copy from './create.copy';
import { useStoredDraft, draftKey } from './create.draft';
import { Complete, FundingStep, InfoStep, Preview, ReviewStep, type Form } from './create.parts';
import { validate, type Draft, type Errors, type Step } from './create.rules';
import { submit, type Stage } from './create.submit';

const BUSY: readonly Stage[] = ['metadata', 'preflight', 'wallet', 'submitted', 'indexing'];
const FAILED: readonly Stage[] = [
  'failed',
  'rejected',
  'preflight-failed',
  'gas',
  'network',
  'invalid-json',
  'unavailable',
];
const PHONE = '(max-width:680px)';
const STATUS_ICON = 19;

/** The sentence of each stage; COPY ids are lorem until the owner approves them. */
const LINE: Partial<Record<Stage, string>> = {
  metadata: copy.SAVING,
  wallet: copy.WALLET,
  submitted: copy.SUBMITTED,
  indexing: copy.INDEXING,
  rejected: copy.REJECTED,
  failed: copy.FAILED,
  unavailable: copy.UNAVAILABLE,
};

const LOREM_LINE: Partial<Record<Stage, string>> = {
  'preflight-failed': 'COPY-175',
  gas: 'COPY-155',
  network: 'COPY-156',
  'invalid-json': 'COPY-002',
};

const ICON: Partial<Record<Stage, IconName>> = { wallet: 'wallet' };

function StatusLine({ stage }: { stage: Stage }) {
  const lorem = LOREM_LINE[stage];
  const text = LINE[stage] ?? (lorem === undefined ? undefined : <Lorem id={lorem} />);

  if (text === undefined) {
    return null;
  }

  const failed = FAILED.includes(stage);

  return (
    <div
      className={failed ? 'cc-transaction cc-error-box' : 'cc-transaction'}
      role={failed ? 'alert' : 'status'}
    >
      <Icon name={failed ? 'warning' : (ICON[stage] ?? 'clock')} size={STATUS_ICON} />
      <span>{text}</span>
    </div>
  );
}

type NavProps = { step: Step; busy: boolean; goTo: (step: Step) => void };

function StepNav({ step, busy, goTo }: NavProps) {
  return (
    <nav className="cc-steps" aria-label={copy.STEPS_LABEL}>
      {copy.STEPS.map((label, index) => (
        <button
          key={label}
          type="button"
          disabled={index > step || busy}
          aria-current={index === step ? 'step' : undefined}
          onClick={() => goTo(index as Step)}
        >
          <span>{index < step ? <Icon name="check" size={14} /> : `0${index + 1}`}</span>
          {label}
        </button>
      ))}
    </nav>
  );
}

const firstFailing = (
  draft: Draft,
  codes: readonly string[],
  now: number,
): { step: Step; errors: Errors } => {
  const info = validate(draft, 0, codes, now);
  const funding = validate(draft, 1, codes, now);

  return Object.keys(info).length > 0
    ? { step: 0, errors: { ...info, ...funding } }
    : { step: 1, errors: funding };
};

const without = (errors: Errors, key: keyof Draft): Errors =>
  Object.fromEntries(Object.entries(errors).filter(([name]) => name !== key));

/** The inputs, the step, the errors and the stage; the draft is the stored one with the defaults a blank field takes. */
function useForm(profile: Profile, codes: readonly string[]) {
  const chainId = actingChainId(config().chainId);
  const { stored, save, clear } = useStoredDraft(draftKey(profile, chainId));
  const [errors, setErrors] = useState<Errors>({});
  const [stage, setStage] = useState<Stage>('idle');
  const draft: Draft = {
    ...stored.draft,
    species: stored.draft.species || (codes[0] ?? ''),
    creator: stored.draft.creator || (profile.walletAddress ?? ''),
  };
  const edit = (key: keyof Draft, next: Draft[keyof Draft]): void => {
    save({ draft: { ...stored.draft, [key]: next } });
    setErrors((now) => without(now, key));
    setStage('idle');
  };

  return {
    chainId,
    stored,
    save,
    clear,
    errors,
    setErrors,
    stage,
    setStage,
    draft,
    form: {
      draft,
      errors,
      set: (key, value) => edit(key, value),
      setSplit: (index, value) =>
        edit(
          'splits',
          stored.draft.splits.map((share, slot) => (slot === index ? value : share)),
        ),
    } satisfies Form,
    goTo: (step: Step): void => {
      save({ step });
      setErrors({});
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
  };
}

type FormState = ReturnType<typeof useForm>;

/** "Create campaign": the lock, the pipeline, and what the page shows when it ends. */
function useCreate(state: FormState, codes: readonly string[], operator: boolean) {
  const session = useChainSession();
  const { notify } = useToast();
  const [done, setDone] = useState<{ draft: Draft; address: string } | null>(null);
  const flight = useRef(false);
  const { draft, stored, save, clear, setStage, setErrors } = state;

  const run = async (): Promise<void> => {
    const result = await submit({
      draft,
      speciesCodes: codes,
      stored: stored.metadata,
      operator,
      chainId: state.chainId,
      factory: actingFactory(config().campaignFactory),
      timeUnit: actingTimeUnit(config().timeUnitSeconds),
      session,
      setStage,
      keep: (metadata) => save({ metadata }),
    });

    if (typeof result === 'string') {
      setDone({ draft, address: result });
      clear();
      setStage('complete');
      notify(copy.CREATED_TOAST);

      return;
    }

    setStage(result.stage);
    setErrors(result.errors ?? {});
    save(result.errors === undefined ? {} : { step: 0 });
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();

    const now = Date.now();
    const here =
      stored.step === 2
        ? firstFailing(draft, codes, now)
        : { step: stored.step, errors: validate(draft, stored.step, codes, now) };

    if (Object.keys(here.errors).length > 0) {
      save({ step: here.step });
      setErrors(here.errors);
    } else if (stored.step < 2) {
      state.goTo((stored.step + 1) as Step);
    } else if (!flight.current && !BUSY.includes(state.stage)) {
      flight.current = true;
      void run().finally(() => {
        flight.current = false;
      });
    }
  };

  const backToReview = (): void => {
    save(done === null ? {} : { draft: done.draft, step: 2, metadata: null });
    setDone(null);
    setStage('idle');
  };

  return { done, onSubmit, backToReview };
}

/** The page's own state and handlers; the pieces draw what they are given. */
function useWizard(profile: Profile) {
  const species = useSpecies();
  const items = species.data;
  const codes = (items ?? []).map(({ code }) => code);
  const operator = profile.role === 'operator';
  const state = useForm(profile, codes);
  const create = useCreate(state, codes, operator);

  return {
    ...create,
    draft: state.draft,
    form: state.form,
    step: state.stored.step,
    errors: state.errors,
    stage: state.stage,
    busy: BUSY.includes(state.stage),
    goTo: state.goTo,
    operator,
    speciesName: items?.find(({ code }) => code === state.draft.species)?.name ?? '',
    species: { items, failed: species.isError, retry: () => void species.refetch() },
  };
}

type Wizard = ReturnType<typeof useWizard>;

function Steps({ wizard }: { wizard: Wizard }) {
  const { step, form, species, operator, draft, speciesName, goTo } = wizard;

  return (
    <fieldset disabled={wizard.busy} className="cc-fields">
      {step === 0 && <InfoStep form={form} species={species} />}
      {step === 1 && <FundingStep form={form} operator={operator} />}
      {step === 2 && (
        <ReviewStep draft={draft} speciesName={speciesName} operator={operator} goTo={goTo} />
      )}
    </fieldset>
  );
}

function ErrorBox({ errors }: { errors: Errors }) {
  const box = useRef<HTMLDivElement>(null);
  const failed = Object.values(errors).some(Boolean);

  useEffect(() => {
    if (failed) {
      box.current?.focus();
    }
  }, [failed, errors]);

  if (!failed) {
    return null;
  }

  return (
    <div className="cc-error-box" role="alert" ref={box} tabIndex={-1}>
      {errors.box?.startsWith('COPY-') === true ? (
        <Lorem id={errors.box} />
      ) : (
        (errors.box ?? copy.CHECK_FIELDS)
      )}
    </div>
  );
}

function Actions({ wizard, walletMissing }: { wizard: Wizard; walletMissing: boolean }) {
  const { step, busy } = wizard;
  const label = [copy.CONTINUE, copy.REVIEW_CAMPAIGN, copy.CREATE][step];

  return (
    <div className="cc-actions">
      <button
        type="button"
        className="button outline"
        disabled={step === 0 || busy}
        onClick={() => wizard.goTo((step - 1) as Step)}
      >
        <Icon name="back" size={16} />
        {copy.BACK}
      </button>
      <button
        type="submit"
        className="button primary"
        disabled={busy || (walletMissing && step === 2)}
      >
        {label}
        <Icon name="arrow" size={17} />
      </button>
    </div>
  );
}

/** The step title takes focus whenever the step changes (CC-5). */
function StepTitle({ step }: { step: Step }) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  return (
    <div className="cc-section-title">
      <span className="eyebrow">{copy.stepEyebrow(step)}</span>
      <h2 ref={heading} tabIndex={-1}>
        {copy.STEP_TITLES[step]}
      </h2>
    </div>
  );
}

/** CC-21: on a phone the focused field scrolls to the centre, so the keyboard never hides the action under it. */
const centre = (event: { target: EventTarget }): void => {
  const field = event.target as HTMLElement;

  if (window.matchMedia(PHONE).matches && field.matches('input,select,textarea')) {
    field.scrollIntoView({ block: 'center' });
  }
};

function Body({ profile }: { profile: Profile }) {
  const wizard = useWizard(profile);
  const queryClient = useQueryClient();
  const walletMissing = profile.walletAddress === null;

  if (wizard.stage === 'complete' && wizard.done !== null) {
    return (
      <Complete
        title={wizard.done.draft.title}
        address={wizard.done.address}
        onBack={wizard.backToReview}
      />
    );
  }

  return (
    <>
      <StepNav step={wizard.step} busy={wizard.busy} goTo={wizard.goTo} />
      <div className="cc-layout">
        <form onSubmit={wizard.onSubmit} onFocus={centre} noValidate className="cc-form">
          <StepTitle step={wizard.step} />
          <ErrorBox errors={wizard.errors} />
          <Steps wizard={wizard} />
          {walletMissing && wizard.step === 2 && (
            <Banner
              tone="callout"
              action={copy.TRY_AGAIN}
              onAction={() => void queryClient.invalidateQueries({ queryKey: ME_KEY })}
            >
              {copy.WALLET_PENDING}
            </Banner>
          )}
          <StatusLine stage={wizard.stage} />
          <Actions wizard={wizard} walletMissing={walletMissing} />
        </form>
        <Preview draft={wizard.draft} speciesName={wizard.speciesName} />
      </div>
    </>
  );
}

export function Component() {
  const session = useSession();

  return (
    <main className="cc-page" id="main-content" tabIndex={-1}>
      <div className="cc-page-heading">
        <div>
          <span className="eyebrow">{copy.EYEBROW}</span>
          <h1>
            {copy.HEADING}
            <span>.</span>
          </h1>
        </div>
      </div>
      {session.phase === 'ready' && <Body profile={session.profile} />}
    </main>
  );
}
