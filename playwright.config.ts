import { defineConfig, devices } from '@playwright/test';

// SR-4: browser specs run in Chromium only. The fidelity harness (tests/fidelity/fidelity.setup.ts, phases.md F0b)
// applies the §2 conditions of docs/FE/fidelity.md on top of this.
export default defineConfig({
  testDir: 'tests/fidelity',
  testMatch: '**/*.spec.ts',
  // S19 films with Chromium's fake camera, so "Open camera & GPS" needs no prompt and no hardware
  use: {
    baseURL: 'http://127.0.0.1:5173',
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
  },
  // the app, served the way the API's CORS origin expects (backend WEB_ORIGIN)
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
