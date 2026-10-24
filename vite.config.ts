// eslint-disable-next-line import/no-unresolved -- the plugin publishes only an exports map, which the import plugin's resolver cannot read
import react from '@vitejs/plugin-react';
// eslint-disable-next-line import/no-unresolved -- vitest/config is an exports-map subpath, which the import plugin's resolver cannot read
import { defineConfig } from 'vitest/config';

// docs/FE/fe-stack.md §1, §4: React 19 on Vite 8; unit tests in jsdom under tests/unit (the browser specs under
// tests/fidelity run in Chromium through Playwright, never here).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/fidelity/*.test.ts'],
    setupFiles: ['tests/unit/setup.ts'],
  },
});
