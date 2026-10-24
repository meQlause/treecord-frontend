import { render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRise } from '../../../../src/shared/ui/useRise';
import { StubObserver } from '../../observer';

function Picture() {
  const root = useRef<SVGSVGElement>(null);

  useRise(root);

  return (
    <svg ref={root} data-testid="picture">
      <g className="rise" />
      <rect className="grow" />
    </svg>
  );
}

const motionAllowed = () =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('no-preference'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  }));

afterEach(() => {
  // the setup file's default (reduced motion matches nothing) comes back for the next test
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  }));
});

describe('useRise', () => {
  it('waits for the picture to scroll into view, plays once, then stops watching', () => {
    motionAllowed();
    const { getByTestId } = render(<Picture />);
    const picture = getByTestId('picture');
    const observer = StubObserver.watching(picture);

    expect(observer).toBeDefined();
    observer?.report(picture, false);
    expect(StubObserver.watching(picture)).toBe(observer);
    observer?.report(picture, true);
    expect(StubObserver.watching(picture)).toBeUndefined();
  });

  it('stops watching when the picture goes away', () => {
    motionAllowed();
    const { getByTestId, unmount } = render(<Picture />);
    const picture = getByTestId('picture');

    unmount();
    expect(StubObserver.watching(picture)).toBeUndefined();
  });

  it('shows the picture as is when the person asked for reduced motion', () => {
    const { getByTestId } = render(<Picture />);

    expect(StubObserver.watching(getByTestId('picture'))).toBeUndefined();
  });
});
