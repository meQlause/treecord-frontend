// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useLocation, useNavigate } from 'react-router';
import { Button } from '../../shared/ui/Button';
import { SHELL_COPY } from './shell.copy';

const SIGN_IN = '/sign-in';
const AFTER_SIGN_IN = '/app';

/** FR-004 #3: back to this page afterwards; from the sign-in page itself, to the app. */
export function SignInButton() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const returnTo = pathname.startsWith(SIGN_IN) ? AFTER_SIGN_IN : `${pathname}${search}`;

  return (
    <Button
      variant="sign-in"
      icon="arrow"
      onClick={() => void navigate(`${SIGN_IN}?returnTo=${encodeURIComponent(returnTo)}`)}
    >
      {SHELL_COPY.signIn}
    </Button>
  );
}
