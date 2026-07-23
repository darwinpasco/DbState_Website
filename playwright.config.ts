import { defineConfig } from "@playwright/test";

const isCi = Boolean(
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.CI,
);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: isCi ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://127.0.0.1:4321",
    locale: "en-US",
    colorScheme: "dark",
    contextOptions: {
      reducedMotion: "reduce",
    },
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "off",
  },
  webServer: {
    command: "node ./scripts/playwright-web-server.mjs",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: !isCi,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
