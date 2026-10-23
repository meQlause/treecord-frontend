// SR-2 path parity (docs/strict-rules.md): tests/ mirrors src/, and no test file lives inside src/.
// tests/unit/<p>/<name>.test.ts(x) must have src/<p>/<name>.ts or src/<p>/<name>.tsx. The browser specs under
// tests/fidelity run whole flows across files, so they have no mirror.
import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const TEST_FILE = /\.(test|spec)\.tsx?$/;
const MIRRORED_ROOT = 'tests/unit';

const walk = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
      )
    : [];

const posix = (path: string): string => relative('.', path).split(sep).join('/');

const testsInSrc = walk('src')
  .map(posix)
  .filter((file) => TEST_FILE.test(file))
  .map((file) => `${file}: test file inside src/`);

const sourceFor = (testFile: string): string[] => {
  const base = testFile.replace(`${MIRRORED_ROOT}/`, 'src/').replace(TEST_FILE, '');

  return [`${base}.ts`, `${base}.tsx`];
};

const unmirrored = walk(MIRRORED_ROOT)
  .map(posix)
  .filter((file) => TEST_FILE.test(file))
  .filter((file) => !sourceFor(file).some((source) => existsSync(source)))
  .map((file) => `${file}: no src/ file at the mirrored path`);

const problems = [...testsInSrc, ...unmirrored];

for (const problem of problems) {
  console.error(problem);
}

process.exitCode = problems.length > 0 ? 1 : 0;
