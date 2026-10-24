// S11 Profile (s11-profile.md): the signed-in account — its name, its role switch (D01) and its wallet. Any role may open
// it. The profile is the shell's `useMe()` answer; S11 makes no read of its own and writes through `POST /profile`.
import { useSession } from '../../app/session/session';
import { nameOf, roleLabel } from '../../app/session/profile-rules';
import { PassportArt } from './profile.art';
import { PageHead } from '../../shared/ui/PageHead';
import { ACCOUNT_EYEBROW, HELLO, PROFILE_COORD } from './accounts.copy';
import { PersonalPanel, WalletPanel } from './profile.parts';

export function Component() {
  const session = useSession();

  if (session.phase !== 'ready') {
    return null;
  }

  const { profile } = session;
  const email = profile.email ?? '';
  const shown = nameOf(profile.displayName, profile.email);
  const role = roleLabel(profile.role);

  return (
    <>
      <PageHead
        eyebrow={ACCOUNT_EYEBROW(role)}
        title={HELLO}
        em={<span className="wrap-any">{shown}.</span>}
        inline
        testId="pf-heading"
        art={<PassportArt name={shown} persona={role} />}
        coord={PROFILE_COORD}
      />
      <div className="ws-columns pf-columns">
        <PersonalPanel profile={profile} shown={shown} email={email} />
        <WalletPanel profile={profile} shown={shown} />
      </div>
    </>
  );
}
