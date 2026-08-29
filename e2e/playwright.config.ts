import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, TMP } from './paths';

/**
 * The end-to-end flow: a real `counsel-os serve`, the built page, and a
 * browser (spec §6). Deliberately outside `bun test` — the root `test` script
 * is scoped to `runtime/src browse/src scripts`, and this suite needs a
 * server, a build and Chromium, none of which belong in a unit run.
 *
 * `e2e/serve.ts` owns the server AND the fixture it serves; see the note
 * there about why the seeding cannot live in `globalSetup`.
 *
 * Chromium must be installed for the pinned Playwright version:
 *   bunx playwright install chromium
 */
export default defineConfig({
  testDir: '.',
  // The flow is one ordered story against one server with one vault on disk;
  // sharding it across workers would have two browsers approving proposals
  // in the same vault.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: [['list']],
  outputDir: `${TMP}/test-results`,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun e2e/serve.ts',
    cwd: '..',
    url: `${BASE_URL}/`,
    // A build plus a cold Bun start; generous, because the failure mode of a
    // tight timeout here is a flaky suite rather than a caught bug.
    timeout: 180_000,
    // Never adopt whatever is already on 7499: it would be serving somebody
    // else's vault, and the token in `runtime.json` would not match it.
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
