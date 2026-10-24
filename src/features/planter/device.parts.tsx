// S22's pieces (s22-device.md §1): the signing key panel — card, facts, the register form (D02) and the revoke review (D03) —
// and the panel of what the key proves. Each takes plain props; the page reads the key, the list and the actions.
import type { ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { Icon } from '../../shared/art/Icon';
import { Banner } from '../../shared/ui/Banner';
import { Button } from '../../shared/ui/Button';
import { Facts } from '../../shared/ui/Facts';
import { Field } from '../../shared/ui/Field';
import { Lorem } from '../../shared/ui/Lorem';
import { Panel } from '../../shared/ui/Panel';
import { ReviewAction } from '../../shared/ui/ReviewAction';
import { KeyCard, ProofFlow, type CardKey } from './device.art';
import {
  ALGORITHM,
  CANCEL,
  CLOSE,
  CONFIRM,
  CREATING,
  ERROR_COPY,
  FACT_ALGORITHM,
  FACT_HASH,
  FACT_KEY_ID,
  FACT_LABEL,
  FACT_PAYLOAD,
  FACT_PRIVATE,
  FACT_SIGNATURE,
  GO_TO_TREES,
  HASH,
  KEY_LOST,
  LABEL_FIELD,
  LABEL_HINT,
  LABEL_RULE,
  NOTE_GPS,
  NOTE_PRIVATE,
  PANEL_KEY,
  PANEL_PROOF,
  PAYLOAD,
  PRIVATE_HERE,
  PRIVATE_NONE,
  QUEUED_WARNING,
  REGISTER,
  REVIEW_SUMMARY,
  REVOKE,
  REVOKED,
  SIGNATURE,
  reviewRegion,
  type ErrorKey,
} from './device.copy';
import { keyIdShort } from './device.rules';

const WARN_ICON = 16;
const ARROW_ICON = 15;
const DASH = '—';

const messageOf = (key: ErrorKey): ReactNode => {
  const message = ERROR_COPY[key];

  return typeof message === 'string' ? message : <Lorem id={message.copyId} />;
};

type RegisterProps = {
  label: string;
  failure: ErrorKey | null;
  busy: boolean;
  onLabel: (label: string) => void;
  onRegister: () => void;
};

/** D02: the label field with its rule up front, the alert a refusal or a failure raises, and the button. */
function RegisterForm({ label, failure, busy, onLabel, onRegister }: RegisterProps) {
  return (
    <>
      <Field
        label={
          <>
            {LABEL_FIELD} · <Lorem id={LABEL_RULE} kind="label" />
          </>
        }
        hint={<Lorem id={LABEL_HINT} />}
        {...(failure === 'FIELD' ? { error: messageOf('FIELD') } : {})}
      >
        <input maxLength={64} value={label} onChange={(event) => onLabel(event.target.value)} />
      </Field>
      {failure !== null && failure !== 'FIELD' && (
        <p role="alert" className="si-error">
          <Icon name="warning" size={WARN_ICON} />
          <span>{messageOf(failure)}</span>
        </p>
      )}
      <div className="pf-foot">
        <div className="pf-actions">
          <Button
            busy={busy}
            busyLabel={CREATING}
            icon="arrow"
            disabled={label.trim() === ''}
            onClick={onRegister}
          >
            {REGISTER}
          </Button>
        </div>
        <p className="ws-note">{NOTE_PRIVATE}</p>
      </div>
    </>
  );
}

type RevokeProps = {
  label: string;
  queued: number;
  failed: boolean;
  onRevoke: () => Promise<boolean>;
};

/** D03: the review names the device first, warns about queued recordings, and cannot be cancelled while it runs. */
function RevokeAction({ label, queued, failed, onRevoke }: RevokeProps) {
  return (
    <>
      <div className="pf-foot">
        <div className="pf-actions">
          <ReviewAction
            label={REVOKE}
            copy={{
              region: reviewRegion(REVOKE),
              summary: REVIEW_SUMMARY,
              confirm: CONFIRM,
              cancel: CANCEL,
              close: CLOSE,
              done: REVOKED,
            }}
            target={[[FACT_LABEL, label]]}
            {...(failed ? { error: messageOf('FAILED') } : {})}
            onConfirm={onRevoke}
          >
            {queued > 0 && (
              <div data-count={queued}>
                <Banner tone="callout" icon="warning">
                  <Lorem id={QUEUED_WARNING} values={{ count: queued }} />
                </Banner>
              </div>
            )}
          </ReviewAction>
        </div>
        <p className="ws-note">{NOTE_PRIVATE}</p>
      </div>
    </>
  );
}

type PanelProps = {
  record: CardKey | null;
  lost: boolean;
  register: RegisterProps;
  revoke: Omit<RevokeProps, 'label'>;
};

/** "Signing key": the card, the facts, then the register form without a ready key or the revoke action with one. */
export function SigningPanel({ record, lost, register, revoke }: PanelProps) {
  return (
    <Panel title={PANEL_KEY} icon="profile">
      <KeyCard record={record} lost={lost} />
      <Facts
        rows={[
          [FACT_ALGORITHM, ALGORITHM],
          [FACT_PRIVATE, record === null ? PRIVATE_NONE : PRIVATE_HERE],
          [
            FACT_KEY_ID,
            record === null ? (
              DASH
            ) : (
              <code className="ev-code">{keyIdShort(record.thumbprint)}</code>
            ),
          ],
        ]}
      />
      {lost && (
        <p role="alert" className="ws-callout">
          {KEY_LOST}
        </p>
      )}
      {record === null ? (
        <RegisterForm {...register} />
      ) : (
        <RevokeAction label={record.label} {...revoke} />
      )}
    </Panel>
  );
}

/** "What the key proves": the flow, the three facts and the way back to the trees. */
export function ProofPanel({ ready }: { ready: boolean }) {
  return (
    <Panel title={PANEL_PROOF} icon="check">
      <ProofFlow ready={ready} />
      <Facts
        rows={[
          [FACT_HASH, HASH],
          [FACT_PAYLOAD, PAYLOAD],
          [FACT_SIGNATURE, SIGNATURE],
        ]}
      />
      <div className="pf-foot">
        <div className="pf-actions">
          <Link className="button outline" to="/app/planter/trees">
            {GO_TO_TREES}
            <Icon name="arrow" size={ARROW_ICON} />
          </Link>
        </div>
        <p className="ws-note">{NOTE_GPS}</p>
      </div>
    </Panel>
  );
}
