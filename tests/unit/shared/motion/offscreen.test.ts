import { describe, expect, it } from 'vitest';
import { watchOffscreen } from '../../../../src/shared/motion/offscreen';
import { StubObserver } from '../../observer';

describe('watchOffscreen', () => {
  it('marks an element offscreen while it is out of view and clears it when it returns', () => {
    const element = document.createElement('div');
    const stop = watchOffscreen(element);
    const observer = StubObserver.watching(element) as StubObserver;

    observer.report(element, false);
    expect(element).toHaveClass('offscreen');
    observer.report(element, true);
    expect(element).not.toHaveClass('offscreen');
    stop();
    expect(StubObserver.watching(element)).toBeUndefined();
  });

  it('serves every element with one shared observer', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');

    watchOffscreen(first);
    watchOffscreen(second);
    expect(StubObserver.watching(first)).toBe(StubObserver.watching(second));
  });
});
