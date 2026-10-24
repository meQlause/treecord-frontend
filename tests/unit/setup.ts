import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { StubObserver } from './observer';

// jsdom has neither of these; every animated piece asks for both. The shared offscreen watcher
// (src/shared/motion/offscreen.ts) is made once per test file, so the stub keeps its observers for the whole file.
vi.stubGlobal('IntersectionObserver', StubObserver);
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => false,
  onchange: null,
}));

// every test starts with an empty document
afterEach(cleanup);
