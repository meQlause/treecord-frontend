import { AccountMenu, type AccountProfile } from './AccountMenu';
import { Brand } from './Brand';
import { useHeaderScroll } from './header-scroll';
import { MotionToggle } from './MotionToggle';
import { NetworkLabel } from './NetworkLabel';
import { PublicNav } from './PublicNav';
import { SignInButton } from './SignInButton';

/** FR-006. Signed out: the public menu and "Sign in". Signed in: the account menu (the sidebar carries the nav). */
export function Header({
  profile,
  onSignOut,
}: {
  profile: AccountProfile | null;
  onSignOut: () => void;
}) {
  const { ref, compact } = useHeaderScroll();

  return (
    <header ref={ref} className={compact ? 'header header--compact' : 'header'}>
      <span className="header-progress" aria-hidden="true" />
      <div className="header-inner">
        <Brand />
        {profile === null && <PublicNav />}
        <div className="header-actions">
          <NetworkLabel />
          <MotionToggle />
          {profile === null ? (
            <SignInButton />
          ) : (
            <AccountMenu profile={profile} onSignOut={onSignOut} />
          )}
        </div>
      </div>
    </header>
  );
}
