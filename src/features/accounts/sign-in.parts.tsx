import type { FormEvent, ReactNode } from 'react';
import { Icon } from '../../shared/art/Icon';
import { Landscape } from '../../shared/art/Landscape';
import { Button } from '../../shared/ui/Button';
import { Field } from '../../shared/ui/Field';
import { Lorem } from '../../shared/ui/Lorem';
import {
  ART_BODY,
  ART_EYEBROW,
  ART_TITLE,
  ART_TITLE_EM,
  CODE_LABEL,
  CODE_LEAD,
  CODE_TITLE,
  DIFFERENT_EMAIL,
  EMAIL_LABEL,
  EMAIL_PLACEHOLDER,
  READY_NOTE,
  READY_TITLE,
  SEND_CODE,
  SIGNED_IN_AS,
  SIGN_IN_ERRORS,
  SIGN_IN_TITLE,
  STEPS_LABEL,
  STEP_LABELS,
  VERIFY,
  continueTo,
  signInLead,
  type Message,
  type SignInErrorKey,
} from './accounts.copy';

// The presentational pieces of S02 (mockup shared-pages.jsx:142-170). The page owns the state.
const STEP_ICON = 12;
const ALERT_ICON = 16;
const READY_ICON = 26;
const CODE_LENGTH = 6;
const ERROR_ID = 'si-error';

/** Left half: decorative, so hidden from assistive technology (the card carries the meaning). */
export function SignInArt() {
  return (
    <section className="si-art" aria-hidden="true">
      <Landscape kind="grove" hero />
      <div className="si-art-copy">
        <span className="eyebrow">{ART_EYEBROW}</span>
        <h1>
          {ART_TITLE}
          <br />
          <em>{ART_TITLE_EM}</em>
        </h1>
        <p>{ART_BODY}</p>
      </div>
    </section>
  );
}

const stepClass = (index: number, step: number): string => {
  if (index < step) {
    return 'done';
  }

  return index === step ? 'now' : '';
};

/** SI-1 … SI-16: `step` is 0 Email, 1 Code, 2 Ready. */
export function SignInSteps({ step }: { step: number }) {
  return (
    <ol className="si-steps" aria-label={STEPS_LABEL}>
      {STEP_LABELS.map((label, index) => (
        <li
          key={label}
          className={stepClass(index, step)}
          aria-current={index === step ? 'step' : undefined}
        >
          <span>{index < step ? <Icon name="check" size={STEP_ICON} /> : index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

const messageOf = (message: Message): ReactNode =>
  typeof message === 'string' ? message : <Lorem id={message.copyId} />;

/** The one alert of a step (FR-003); the field above it points here with `aria-describedby`. */
function SignInAlert({ error }: { error: SignInErrorKey }) {
  return (
    <p id={ERROR_ID} role="alert" className="si-error" data-testid="si-error">
      <Icon name="warning" size={ALERT_ICON} />
      <span>{messageOf(SIGN_IN_ERRORS[error])}</span>
    </p>
  );
}

const invalid = (error: SignInErrorKey | null) =>
  error === null ? {} : ({ 'aria-invalid': true, 'aria-describedby': ERROR_ID } as const);

type Submit = (event: FormEvent<HTMLFormElement>) => void;

type EmailStepProps = {
  where: string;
  email: string;
  busy: boolean;
  error: SignInErrorKey | null;
  onEmail: (value: string) => void;
  onSubmit: Submit;
};

/** SI-1 … SI-5. Native `type="email" required` is the validation (SI-2). */
export function EmailStep({ where, email, busy, error, onEmail, onSubmit }: EmailStepProps) {
  return (
    <form onSubmit={onSubmit}>
      <h2 id="si-title">{SIGN_IN_TITLE}</h2>
      <p className="si-lead">{signInLead(where)}</p>
      <Field label={EMAIL_LABEL}>
        <input
          type="email"
          required
          value={email}
          readOnly={busy}
          autoComplete="email"
          placeholder={EMAIL_PLACEHOLDER}
          onChange={(event) => onEmail(event.target.value)}
          {...invalid(error)}
        />
      </Field>
      {error !== null && <SignInAlert error={error} />}
      <Button type="submit" busy={busy} icon="arrow">
        {SEND_CODE}
      </Button>
    </form>
  );
}

type CodeStepProps = {
  email: string;
  code: string;
  busy: boolean;
  error: SignInErrorKey | null;
  onCode: (value: string) => void;
  onSubmit: Submit;
  onRestart: () => void;
};

/** SI-6 … SI-14. The pattern is FR-002's; the digits-only filter lives in `onCode`. */
export function CodeStep({ email, code, busy, error, onCode, onSubmit, onRestart }: CodeStepProps) {
  return (
    <form onSubmit={onSubmit}>
      <h2 id="si-title">{CODE_TITLE}</h2>
      <p className="si-lead">
        {CODE_LEAD} <strong>{email}</strong>.
      </p>
      <Field label={CODE_LABEL}>
        <input
          className="si-code"
          required
          pattern="[0-9]{6}"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          value={code}
          readOnly={busy}
          onChange={(event) => onCode(event.target.value)}
          {...invalid(error)}
        />
      </Field>
      {error !== null && <SignInAlert error={error} />}
      <Button type="submit" busy={busy} icon="arrow">
        {VERIFY}
      </Button>
      <Button variant="text" onClick={onRestart}>
        {DIFFERENT_EMAIL}
      </Button>
    </form>
  );
}

type ReadyStepProps = {
  name: string;
  role: string;
  email: string;
  where: string;
  onContinue: () => void;
};

/** SI-16 / SI-17: a status, not a form; nothing is sent from here. */
export function ReadyStep({ name, role, email, where, onContinue }: ReadyStepProps) {
  return (
    <div className="si-done" role="status">
      <span className="si-ok">
        <Icon name="check" size={READY_ICON} />
      </span>
      <h2 id="si-title">{READY_TITLE}</h2>
      <p className="si-lead">
        {SIGNED_IN_AS}{' '}
        <strong className="wrap-any" data-testid="si-name">
          {name}
        </strong>{' '}
        · {role} ({email}). {READY_NOTE}
      </p>
      <Button onClick={onContinue} icon="arrow">
        {continueTo(where)}
      </Button>
    </div>
  );
}
