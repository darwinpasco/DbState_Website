import baseConfig from "./playwright.config";
import { defineConfig } from "@playwright/test";

const focusedPort =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.DBSTATE_PRIVATE_BETA_CLIENT_PORT ?? "4322";
const focusedBaseUrl = `http://127.0.0.1:${focusedPort}`;

export default defineConfig({
  ...baseConfig,
  testIgnore: [],
  testMatch: ["private-beta-client.spec.ts"],
  use: {
    ...baseConfig.use,
    baseURL: focusedBaseUrl,
  },
  webServer: {
    command: `node ./scripts/playwright-web-server.mjs --port ${focusedPort}`,
    url: focusedBaseUrl,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
