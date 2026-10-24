import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStickyFit } from '../../../../src/shared/ui/useStickyFit';

type Options = Parameters<typeof useStickyFit>[0];

function Column({ options, top }: { options: Options; top?: string }) {
  const ref = useStickyFit<HTMLElement>(options);

  return (
    <aside ref={ref} style={top === undefined ? undefined : { top }}>
      column
    </aside>
  );
}

let layoutBottom = 2000;
let screenHeight = 800;
const room = (name: string): string => screen.getByText('column').style.getPropertyValue(name);

beforeEach(() => {
  layoutBottom = 2000;
  screenHeight = 800;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({ bottom: layoutBottom }) as DOMRect,
  );
  Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => screenHeight });
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, 'ResizeObserver');
});

describe('useStickyFit: room', () => {
  it('fills the screen below the header', () => {
    render(<Column options={{ roomVar: '--side-room', top: 84 }} />);

    expect(room('--side-room')).toBe('716px');
  });

  it('reads the offset from the column own top, 84 when it has none', () => {
    const { unmount } = render(<Column options={{ roomVar: '--side-room' }} top="100px" />);

    expect(room('--side-room')).toBe('700px');
    unmount();
    render(<Column options={{ roomVar: '--side-room' }} />);
    expect(room('--side-room')).toBe('716px');
  });

  it('stops at the end of the layout it sits in, as the page scrolls', () => {
    layoutBottom = 300;
    render(<Column options={{ roomVar: '--side-room', top: 84 }} />);
    expect(room('--side-room')).toBe('216px');

    layoutBottom = 200;
    fireEvent.scroll(window);
    expect(room('--side-room')).toBe('116px');
  });

  it('fits again when the window is resized', () => {
    render(<Column options={{ roomVar: '--side-room', top: 84 }} />);
    screenHeight = 600;
    fireEvent.resize(window);

    expect(room('--side-room')).toBe('516px');
  });

  it('stops listening once it unmounts', () => {
    const remove = vi.spyOn(window, 'removeEventListener');

    render(<Column options={{ roomVar: '--side-room', top: 84 }} />).unmount();

    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});

describe('useStickyFit: a column taller than the screen', () => {
  const rail: Options = { roomVar: '--rail-room', topVar: '--rail-top', top: 104, gap: 20 };

  it('keeps the gap at the bottom of the screen', () => {
    render(<Column options={rail} />);

    expect(room('--rail-room')).toBe('676px');
  });

  it('keeps its bottom in view instead of its top', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(900);
    render(<Column options={rail} />);

    expect(room('--rail-top')).toBe('-120px');
  });

  it('stays at the header when it is shorter than the screen', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);
    render(<Column options={rail} />);

    expect(room('--rail-top')).toBe('104px');
  });

  it('measures again when the layout around it changes size', () => {
    let measure = (): void => undefined;

    class StubResize {
      constructor(callback: () => void) {
        measure = callback;
      }

      observe = vi.fn();

      disconnect = vi.fn();
    }

    vi.stubGlobal('ResizeObserver', StubResize);
    const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);

    render(<Column options={rail} />);
    expect(room('--rail-top')).toBe('104px');

    height.mockReturnValue(900);
    measure();
    expect(room('--rail-top')).toBe('-120px');
  });
});
