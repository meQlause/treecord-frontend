// @vitest-environment node
// NFR-003 / ADR-014: a client build contains none of the server secrets, neither their names nor their values.
import { existsSync, readFileSync } from 'node:fs';
// eslint-disable-next-line import/no-unresolved -- vite publishes only an exports map, which the import plugin's resolver cannot read
import { build } from 'vite';
import { beforeAll, describe, expect, it } from 'vitest';

const SECRET_NAMES = [
  'DATABASE_URL',
  'PRIVY_APP_SECRET',
  'ATTESTER_PRIVATE_KEY',
  'OPERATOR_PRIVATE_KEY',
  'RELAYER_PRIVATE_KEY',
  'AI_SERVICE_TOKEN',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'MINIO_ROOT_PASSWORD',
];
const BACKEND_ENV = '../backend/.env';
// a shorter value ("local", "true") would match ordinary code
const MIN_SECRET_LENGTH = 16;
const BUILD_TIMEOUT = 120_000;

const secretValues = (): string[] => {
  if (!existsSync(BACKEND_ENV)) {
    return [];
  }

  return readFileSync(BACKEND_ENV, 'utf8')
    .split(/\r?\n/)
    .map((line) => /^([A-Z0-9_]+)=(.*)$/.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .filter(([, name]) => SECRET_NAMES.includes(name ?? ''))
    .map(([, , value]) => (value ?? '').replace(/^["']|["']$/g, ''))
    .filter((value) => value.length >= MIN_SECRET_LENGTH);
};

describe('the production client build', () => {
  let bundle = '';

  beforeAll(async () => {
    // vitest runs with NODE_ENV=test, which Vite reads as a development build (`import.meta.env.DEV`): build as production
    const mode = process.env.NODE_ENV;

    process.env.NODE_ENV = 'production';

    const result = await build({ logLevel: 'silent', mode: 'production', build: { write: false } });

    if (mode === undefined) {
      Reflect.deleteProperty(process.env, 'NODE_ENV');
    } else {
      process.env.NODE_ENV = mode;
    }

    const outputs = (Array.isArray(result) ? result : [result]).flatMap((one) =>
      'output' in one ? one.output : [],
    );

    bundle = outputs
      .map((chunk) => ('code' in chunk ? chunk.code : String(chunk.source)))
      .join('\n');
  }, BUILD_TIMEOUT);

  it('is not empty', () => {
    expect(bundle.length).toBeGreaterThan(0);
  });

  it.each(SECRET_NAMES)('does not name %s', (name) => {
    expect(bundle).not.toContain(name);
  });
  // F2b: the browser specs sign with a test key through `window.treecordE2E`, a dev-server-only seam (shared/chain/wallet.ts)
  it('has no test-wallet seam and none of the anvil keys the specs use', () => {
    expect(bundle).not.toContain('treecordE2E');
    expect(bundle).not.toContain(
      '8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
    );
  });

  it("does not contain the value of any secret in the backend's .env", () => {
    secretValues().forEach((value) => expect(bundle).not.toContain(value));
  });
});
