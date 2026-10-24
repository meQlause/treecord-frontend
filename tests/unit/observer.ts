// jsdom has no IntersectionObserver. This stand-in records every observer so a test can say "this element scrolled off
// screen" and watch what the component does. tests/unit/setup.ts installs it for every test.
type Callback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

export class StubObserver {
  static readonly instances: StubObserver[] = [];

  readonly targets = new Set<Element>();

  constructor(private readonly callback: Callback) {
    StubObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.targets.add(target);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  disconnect(): void {
    this.targets.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** Reports `target` as on screen or off it, the way the browser would. */
  report(target: Element, isIntersecting: boolean): void {
    const entry = { target, isIntersecting } as IntersectionObserverEntry;

    this.callback([entry], this as unknown as IntersectionObserver);
  }

  /** The observer watching `target`, if any. */
  static watching(target: Element): StubObserver | undefined {
    return StubObserver.instances.find((observer) => observer.targets.has(target));
  }
}
