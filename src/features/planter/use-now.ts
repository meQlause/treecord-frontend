// The clock a page reads "days left" from (FR-092 uses the client clock). It moves on once a minute while the page is open
// and at once when the person comes back to the tab, so a page left open overnight does not keep yesterday's count.
import { useEffect, useState } from 'react';

const MINUTE_MS = 60_000;

export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = (): void => setNow(Date.now());
    const timer = setInterval(tick, MINUTE_MS);

    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  return now;
}
