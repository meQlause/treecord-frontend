// S11's pieces (s11-profile.md §1): the form, the role switch (D01) and the wallet panel. Each takes the profile and
// the toast; the page decides what to show and where.
import { useState, type ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useNavigate } from 'react-router';
import { useToast } from '../../app/shell/toast-context';
import { useSignOut } from '../../app/shell/use-sign-out';
import { config } from '../../app/session/config';
import { roleLabel } from '../../app/session/profile-rules';
import type { Profile } from '../../app/session/session';
import { shortAddress } from '../../shared/format/address';
import { ArrowLink } from '../../shared/ui/ArrowLink';
import { Banner } from '../../shared/ui/Banner';
import { Button } from '../../shared/ui/Button';
import { Facts } from '../../shared/ui/Facts';
import { Field } from '../../shared/ui/Field';
import { Lorem } from '../../shared/ui/Lorem';
import { Panel } from '../../shared/ui/Panel';
import { ReviewAction } from '../../shared/ui/ReviewAction';
import { useSaveProfile, useSwitchRole } from './accounts.api';
import {
  ACCEPTED,
  AGREEMENT_LABEL,
  BECOME_PLANTER,
  BUYER_LABEL,
  COPY_BLOCKED,
  COPY_WALLET,
  FACT_ADDRESS,
  FACT_AGREEMENT,
  FACT_EMAIL,
  FACT_NETWORK,
  FACT_ROLE,
  FACT_SETTLES,
  NAME_LABEL,
  NAME_RULE,
  NETWORK,
  NOTE_DONOR,
  NOTE_PLANTER,
  NOT_ACCEPTED,
  NOW_DONOR,
  NOW_PLANTER,
  PANEL_PERSONAL,
  PANEL_WALLET,
  PROFILE_SAVED,
  SAVE_ERRORS,
  SAVE_PROFILE,
  SETTLES_IN,
  SIGN_OUT,
  SUMMARY_TO_DONOR,
  SUMMARY_TO_PLANTER_AGAIN,
  SUMMARY_TO_PLANTER_FIRST,
  SWITCH_CANCEL,
  SWITCH_CONFIRM,
  SWITCH_TO_DONOR,
  THIS_DEVICE,
  WALLET_COPIED,
  WALLET_NOT_READY,
  reviewRegion,
  type Message,
  type SaveErrorKey,
} from './accounts.copy';
import { useDraft } from './profile.draft';
import { IdCard, WalletCard } from './profile.art';
import {
  changesOf,
  draftKey,
  draftOf,
  failureOf,
  nameAcceptable,
  needsAgreement,
  switchBody,
  switchTarget,
} from './profile.rules';

const NAME_MAX = 80;

/** A copy that may still be a placeholder (conventions §9). */
const messageOf = (message: Message): ReactNode =>
  typeof message === 'string' ? message : <Lorem id={message.copyId} />;

type FormProps = { profile: Profile; shown: string; email: string };

/** "Personal details": the ID card, the form and the role switch. */
export function PersonalPanel({ profile, shown, email }: FormProps) {
  return (
    <Panel title={PANEL_PERSONAL} icon="profile">
      <ProfileForm profile={profile} shown={shown} email={email} />
      <RoleSwitch profile={profile} />
    </Panel>
  );
}

type NameFieldProps = {
  value: string;
  failure: SaveErrorKey | null;
  busy: boolean;
  onChange: (name: string) => void;
};

/** "Display name", the rule stated up front while it is blank (PF-9), the server's refusal under it (PF-13). */
function NameField({ value, failure, busy, onChange }: NameFieldProps) {
  const blank = value.trim() === '';

  return (
    <Field
      label={
        blank ? (
          <>
            {NAME_LABEL} · <Lorem id={NAME_RULE.copyId} kind="label" />
          </>
        ) : (
          NAME_LABEL
        )
      }
      {...(failure === 'NAME' ? { error: messageOf(SAVE_ERRORS.NAME) } : {})}
    >
      <input
        maxLength={NAME_MAX}
        value={value}
        readOnly={busy}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function ProfileForm({ profile, shown, email }: FormProps) {
  const { typed, edit, discard } = useDraft(draftKey(profile, config().chainId));
  const draft = { ...draftOf(profile), ...typed };
  const save = useSaveProfile();
  const { notify } = useToast();
  const failure: SaveErrorKey | null = save.isError ? failureOf(save.error) : null;
  const role = roleLabel(profile.role);

  const submit = (): void => {
    const changes = changesOf(draft, profile);

    if (Object.keys(changes).length === 0) {
      notify(PROFILE_SAVED);

      return;
    }

    save.mutate(changes, {
      onSuccess: () => {
        discard();
        notify(PROFILE_SAVED);
      },
    });
  };

  return (
    <>
      <IdCard name={draft.displayName.trim() || shown} email={email} persona={role} />
      <form
        className="pf-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <NameField
          value={draft.displayName}
          failure={failure}
          busy={save.isPending}
          onChange={(displayName) => edit({ displayName })}
        />
        <Facts
          rows={[
            [FACT_ROLE, role],
            [FACT_EMAIL, email],
          ]}
        />
        {profile.role === 'donor' && (
          <label className="ws-check">
            <input
              type="checkbox"
              checked={draft.isBuyer}
              onChange={(event) => edit({ isBuyer: event.target.checked })}
            />
            {BUYER_LABEL}
          </label>
        )}
        <div className="pf-foot">
          {failure !== null && failure !== 'NAME' && (
            <Banner tone="error">{messageOf(SAVE_ERRORS[failure])}</Banner>
          )}
          <div className="pf-actions">
            <Button
              type="submit"
              icon="check"
              busy={save.isPending}
              disabled={!nameAcceptable(draft.displayName)}
            >
              {SAVE_PROFILE}
            </Button>
          </div>
          <p className="ws-note">{profile.role === 'planter' ? NOTE_PLANTER : NOTE_DONOR}</p>
        </div>
      </form>
    </>
  );
}

const summaryOf = (target: 'planter' | 'donor', asks: boolean): string => {
  if (target === 'donor') {
    return SUMMARY_TO_DONOR;
  }

  return asks ? SUMMARY_TO_PLANTER_FIRST : SUMMARY_TO_PLANTER_AGAIN;
};

/** D01, inline: the review of becoming a planter (with the agreement) or of going back to donor. */
function RoleSwitch({ profile }: { profile: Profile }) {
  const target = switchTarget(profile.role);
  const [agree, setAgree] = useState(false);
  const [failure, setFailure] = useState<SaveErrorKey | null>(null);
  const [demanded, setDemanded] = useState(false);
  const switching = useSwitchRole();
  const navigate = useNavigate();
  const { notify } = useToast();

  if (target === null) {
    return null;
  }

  // the server asking for the agreement (`agreement_required`) turns the review into the first-time one
  const asks = needsAgreement(target, profile.carbonRightsAgreementAccepted) || demanded;
  const label = target === 'planter' ? BECOME_PLANTER : SWITCH_TO_DONOR;

  const confirm = async (): Promise<boolean> => {
    setFailure(null);

    try {
      await switching.mutateAsync(switchBody(target, asks && agree));
    } catch (error) {
      const refused = failureOf(error);

      setFailure(refused);
      setDemanded((was) => was || refused === 'AGREEMENT');
      setAgree(false);

      return false;
    }

    notify(target === 'planter' ? NOW_PLANTER : NOW_DONOR);
    await navigate('/app');

    return true;
  };

  return (
    <ReviewAction
      label={label}
      copy={{
        region: reviewRegion(label),
        summary: summaryOf(target, asks),
        confirm: SWITCH_CONFIRM,
        cancel: SWITCH_CANCEL,
        close: SWITCH_CANCEL,
        done: label,
      }}
      ready={failure !== 'LOCKED' && (!asks || agree)}
      {...(failure === null ? {} : { error: messageOf(SAVE_ERRORS[failure]) })}
      onConfirm={confirm}
    >
      {asks && (
        <label className="ws-check">
          <input
            type="checkbox"
            checked={agree}
            onChange={(event) => setAgree(event.target.checked)}
          />
          {AGREEMENT_LABEL}
        </label>
      )}
    </ReviewAction>
  );
}

/** "Wallet": the card, the facts and the three things to do with the account. */
export function WalletPanel({ profile, shown }: { profile: Profile; shown: string }) {
  const { notify } = useToast();
  const signOut = useSignOut();
  const { walletAddress: wallet } = profile;
  const role = roleLabel(profile.role);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(wallet ?? '');
      notify(WALLET_COPIED);
    } catch {
      notify(COPY_BLOCKED, true);
    }
  };

  return (
    <Panel title={PANEL_WALLET} icon="wallet">
      {wallet !== null && <WalletCard wallet={wallet} name={shown} persona={role} />}
      <Facts
        rows={[
          [FACT_ADDRESS, wallet === null ? WALLET_NOT_READY : shortAddress(wallet)],
          [FACT_NETWORK, NETWORK],
          [FACT_SETTLES, SETTLES_IN],
          ...(profile.role === 'planter'
            ? [
                [
                  FACT_AGREEMENT,
                  profile.carbonRightsAgreementAccepted ? ACCEPTED : NOT_ACCEPTED,
                ] as const,
              ]
            : []),
        ]}
      />
      <div className="pf-foot">
        <div className="pf-actions">
          <Button
            variant="outline"
            icon="copy"
            disabled={wallet === null}
            onClick={() => void copy()}
          >
            {COPY_WALLET}
          </Button>
          <Button variant="outline" icon="back" onClick={signOut}>
            {SIGN_OUT}
          </Button>
          {profile.role === 'planter' && (
            <ArrowLink to="/app/planter/device">{THIS_DEVICE}</ArrowLink>
          )}
        </div>
      </div>
    </Panel>
  );
}
