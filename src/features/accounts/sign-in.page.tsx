// S02 (s02-sign-in.md): email → six-digit code → Ready. Public; it sits in the workspace frame, so the shell's loading
// (SI-0) and offline (SI-19) states apply. The Privy session lives in the SDK; this page never stores a token.

import { usePrivy } from '@privy-io/react-auth';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { SESSION_EXPIRED } from '../../app/session/expire';
import { nameOf, roleLabel } from '../../app/session/profile-rules';
import { safeReturn } from '../../app/return-to';
import { LoadingState } from '../../app/states/states';
import { WorkspaceMain } from '../../app/states/workspace-main';
import { Banner } from '../../shared/ui/Banner';
import { Lorem } from '../../shared/ui/Lorem';
import { POWERED_BY, PRIVY_NAME, PRIVY_URL, SESSION_ENDED_COPY_ID } from './accounts.copy';
import { whereLabel } from './accounts.rules';
import { useSignIn } from './sign-in.flow';
import { CodeStep, EmailStep, ReadyStep, SignInArt, SignInSteps } from './sign-in.parts';
import './sign-in.css';

// the step list: `Stage` → which of Email / Code / Ready is current
const STEP_OF = { email: 0, code: 1, ready: 2 } as const;

function SignIn() {
  const flow = useSignIn();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const target = safeReturn(params.get('returnTo'));
  const where = whereLabel(target);
  const { profile } = flow;
  const steps = {
    email: (
      <EmailStep
        where={where}
        email={flow.email}
        busy={flow.busy}
        error={flow.error}
        onEmail={flow.onEmail}
        onSubmit={flow.onSend}
      />
    ),
    code: (
      <CodeStep
        email={flow.email}
        code={flow.code}
        busy={flow.busy}
        error={flow.error}
        onCode={flow.onCode}
        onSubmit={flow.onVerify}
        onRestart={flow.onRestart}
      />
    ),
    ready: profile !== null && (
      <ReadyStep
        name={nameOf(profile.displayName, profile.email ?? flow.email)}
        role={roleLabel(profile.role)}
        email={profile.email ?? flow.email}
        where={where}
        onContinue={() => void navigate(target)}
      />
    ),
  };

  return (
    <div className="si">
      <SignInArt />
      <section className="si-card" aria-labelledby="si-title">
        <SignInSteps step={STEP_OF[flow.stage]} />
        {steps[flow.stage]}
        <p className="si-powered">
          {POWERED_BY}{' '}
          <a href={PRIVY_URL} target="_blank" rel="noopener noreferrer">
            {PRIVY_NAME}
          </a>
        </p>
      </section>
    </div>
  );
}

export function Component() {
  const { ready } = usePrivy();
  const { state } = useLocation() as { state: { reason?: string } | null };

  return (
    <WorkspaceMain>
      {state?.reason === SESSION_EXPIRED && (
        <Banner>
          <Lorem id={SESSION_ENDED_COPY_ID} />
        </Banner>
      )}
      {ready ? <SignIn /> : <LoadingState />}
    </WorkspaceMain>
  );
}
