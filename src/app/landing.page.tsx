// FR-009 #3: the bare address opens the landing page, a full navigation because S01 is a separate project; a legacy
// hash link goes to its path inside the app.
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Navigate } from 'react-router';
import { useEffect } from 'react';
import { LANDING, legacyTarget } from './legacy-route';

export function Component() {
  const target = legacyTarget(window.location.href);

  useEffect(() => {
    if (target === LANDING) {
      window.location.replace(LANDING);
    }
  }, [target]);

  return target === LANDING ? null : <Navigate replace to={target} />;
}
