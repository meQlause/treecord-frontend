// The running local stack the stack specs talk to (backend/compose.yaml: PostgreSQL, MinIO, anvil, plus `pnpm start` and
// `pnpm worker` in backend/). They do not start it: a missing piece fails the spec by name, it never skips (phases.md B1).
import { execFileSync } from 'node:child_process';

const API = 'http://localhost:4000';

const WORKER = 'http://localhost:8080/health';
const POSTGRES = 'treecord-postgres-1';
const SECOND = 1000;
const POLL_MS = 1000;

/** Rows of a query on the stack's PostgreSQL, columns split on `|` (no value the specs read contains one). */
export const sql = (query: string): string[][] =>
  execFileSync(
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- the Docker CLI is the only way into the stack's database; it has no fixed install path
    'docker',
    ['exec', POSTGRES, 'psql', '-U', 'treecord', '-d', 'treecord', '-At', '-F', '|', '-c', query],
    { encoding: 'utf8' },
  )
    .split('\n')
    .filter((line) => line !== '' && !/^(INSERT|UPDATE|DELETE)/u.test(line))
    .map((line) => line.split('|'));

const reachable = async (url: string): Promise<boolean> =>
  fetch(url).then(
    (response) => response.ok,
    () => false,
  );

/** The API, the worker and the database answer; otherwise the spec fails saying which is missing. */
export const requireStack = async (): Promise<void> => {
  const missing = [
    (await reachable(`${API}/readyz`)) ? '' : 'the API on :4000 (pnpm start)',
    (await reachable(WORKER)) ? '' : 'the worker on :8080 (pnpm worker)',
  ].filter((name) => name !== '');

  if (missing.length > 0) {
    throw new Error(`the local stack is not running: ${missing.join(', ')}; see backend/README.md`);
  }

  sql('select 1');
};

/** Reads until `read` returns something, up to `seconds`; fails naming `what`. */
export const waitFor = async <Row>(
  what: string,
  read: () => Row | undefined | Promise<Row | undefined>,
  seconds = 120,
): Promise<Row> => {
  for (let waited = 0; waited < seconds; waited += POLL_MS / SECOND) {
    const row = await read();

    if (row !== undefined) {
      return row;
    }

    await new Promise((done) => setTimeout(done, POLL_MS));
  }

  throw new Error(`gave up waiting for ${what}`);
};
