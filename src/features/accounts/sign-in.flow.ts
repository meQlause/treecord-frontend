// The S02 state machine (s02-sign-in.md §1, §3, §6). Two things decide what the card shows: what the person has done in
// this tab (email → code), and what Privy and `GET /me` say about the session. The second wins, so a person who
// arrives already signed in lands on Ready or on the matching alert (SI-18) without any step of their own.

import { useLoginWithEmail, usePrivy } from '@privy-io/react-auth';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useMe } from '../../app/session/use-me';
import type { SignInErrorKey } from './accounts.copy';
import {
  OUTCOME_ERROR,
  SIGN_IN_PROVIDER,
  profileOutcome,
  signInOutcome,
  type ProfileOutcome,
} from './accounts.rules';

type Stage = 'email' | 'code' | 'ready';

const NON_DIGITS = /\D/g;

/** What the person has done here: the email, the code, and what the provider answered. */
function useTypedSteps() {
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [failure, setFailure] = useState<SignInErrorKey | null>(null);
  const [working, setWorking] = useState(false);
  const backToEmail = useCallback(() => {
    setFailure(null);
    setCode('');
    setStage('email');
  }, []);

  const attempt = async (step: 'send' | 'verify', run: () => Promise<void>): Promise<void> => {
    setFailure(null);
    setWorking(true);

    try {
      await run();
    } catch (error) {
      setFailure(SIGN_IN_PROVIDER[signInOutcome(error, step)]);
    } finally {
      setWorking(false);
    }
  };

  return {
    stage,
    email,
    code,
    failure,
    working,
    backToEmail,
    setEmail,
    setFailure,
    setCode: (value: string) => setCode(value.replace(NON_DIGITS, '')),
    send: () =>
      attempt('send', async () => {
        await sendCode({ email });
        setStage('code');
      }),
    verify: () => attempt('verify', () => loginWithCode({ code })),
  };
}

type Typed = ReturnType<typeof useTypedSteps>;

/** What Privy and `GET /me` say, and the two outcomes that end the session (SI-9, SI-15). */
function useSessionView({ setFailure, backToEmail }: Typed) {
  const { authenticated, user, logout } = usePrivy();
  const result = useMe();
  const outcome: ProfileOutcome | null = authenticated ? profileOutcome(result) : null;
  const handled = useRef<ProfileOutcome | null>(null);

  useEffect(() => {
    if (handled.current === outcome) {
      return;
    }

    handled.current = outcome;

    // SI-9: no profile was made, so no session is kept (the alert stays); SI-15: the token was refused, start over
    if (outcome === 'linked') {
      setFailure('WALLET_LINKED');
      void logout();
    }

    if (outcome === 'rejected') {
      backToEmail();
      void logout();
    }
  }, [outcome, logout, setFailure, backToEmail]);

  return {
    authenticated,
    logout,
    stage: stageOf(outcome, authenticated),
    alert: outcome === null ? null : OUTCOME_ERROR[outcome],
    profile: outcome === 'ready' ? (result.data ?? null) : null,
    fetching: authenticated && result.isFetching,
    reread: () => result.refetch(),
    sessionEmail: user?.email?.address,
  };
}

/** The stage the session forces, if any: Ready once the profile is read, Code while a session needs its /me answer. */
const stageOf = (outcome: ProfileOutcome | null, authenticated: boolean): Stage | null => {
  if (outcome === 'ready') {
    return 'ready';
  }

  return authenticated ? 'code' : null;
};

const submit = (action: () => Promise<unknown>) => (event: FormEvent) => {
  event.preventDefault();
  void action();
};

export function useSignIn() {
  const typed = useTypedSteps();
  const session = useSessionView(typed);
  // SI-13 / SI-14: the session exists, so "Verify" only reads /me again
  const reread = async (): Promise<void> => {
    typed.setFailure(null);
    await session.reread();
  };

  return {
    stage: session.stage ?? typed.stage,
    email: session.sessionEmail ?? typed.email,
    code: typed.code,
    error: typed.failure ?? session.alert,
    busy: typed.working || session.fetching,
    profile: session.profile,
    onEmail: typed.setEmail,
    onCode: typed.setCode,
    onSend: submit(typed.send),
    onVerify: submit(session.authenticated ? reread : typed.verify),
    onRestart: () => {
      typed.backToEmail();

      if (session.authenticated) {
        void session.logout();
      }
    },
  };
}
