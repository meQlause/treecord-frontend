import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APPROVED_COPY, fillCopy, untitledCampaign } from '../../../../src/shared/ui/approved-copy';

const SRC = join(__dirname, '../../../../src');
// COPY-100, COPY-101 and COPY-105 are retired (copy-recommendations.md); a comment may still name them
const RETIRED = new Set(['COPY-100', 'COPY-101', 'COPY-105']);

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
  );

describe('approved copy', () => {
  it('every COPY id the code names has approved text, and no screen text is lorem ipsum', () => {
    const sources = files(SRC).map((file) => readFileSync(file, 'utf8'));
    const named = new Set(sources.flatMap((text) => text.match(/COPY-\d{3}/gu) ?? []));
    const missing = [...named].filter((id) => !RETIRED.has(id) && APPROVED_COPY[id] === undefined);

    expect(missing).toEqual([]);
    expect(sources.filter((text) => /['"`]Lorem ipsum/u.test(text))).toEqual([]);
  });

  it('fills a fixed limit by itself and a screen value from the caller', () => {
    expect(fillCopy('COPY-010')).toBe(
      'This account already has 3 active devices. Revoke one from a browser that still holds its key.',
    );
    expect(fillCopy('COPY-013', { available: 2 })).toBe('Only 2 slots are available.');
    expect(untitledCampaign('0x245467c74149f0ca0649ddb6817bae398ddbb64a')).toMatch(
      /^Campaign 0x2454…/u,
    );
  });
});
