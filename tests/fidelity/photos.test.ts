// phases.md F0b 2/3: the five photos are served from public/photos at three widths with their credit line, and the app
// makes no third-party request at runtime (docs/FE/fidelity.md §2, §7).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PHOTOS } from '../../src/shared/art/Photo';

const WIDTHS = [600, 900, 1400];
const FIVE = 5;
const SRC = 'src';
// namespaces, not requests
const INERT_HOST = /^https?:\/\/(www\.)?w3\.org\//;

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : [join(dir, entry.name)],
  );

describe('vendored photos', () => {
  it('names five photos, each with a credit', () => {
    const photos = Object.values(PHOTOS);

    expect(photos).toHaveLength(FIVE);
    photos.forEach((photo) => expect(photo.by).not.toBe(''));
  });

  it.each(Object.entries(PHOTOS))('%s is served at 600, 900 and 1400 wide', (_kind, photo) => {
    WIDTHS.forEach((width) => {
      const file = `public/photos/${photo.id}-${width}.jpg`;

      expect(existsSync(file)).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(0);
    });
  });

  it('ships nothing else in public/photos', () => {
    expect(readdirSync('public/photos')).toHaveLength(FIVE * WIDTHS.length);
  });

  it('no source file names a third-party host', () => {
    const hosts = sourceFiles(SRC)
      .filter((file) => /\.(tsx?|css)$/.test(file))
      .flatMap((file) => readFileSync(file, 'utf8').match(/https?:\/\/[^\s'"`)]+/g) ?? [])
      .filter((url) => !INERT_HOST.test(url));

    expect(hosts).toEqual([]);
  });
});
