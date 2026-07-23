import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations("./migrations");

      return {
        miniflare: {
          compatibilityDate: "2026-07-22",
          bindings: {
            PRIVATE_BETA_INTAKE_MODE: "test",
            TEST_MIGRATIONS: migrations,
          },
          d1Databases: ["PRIVATE_BETA_DB"],
        },
      };
    }),
  ],
  test: {
    include: ["tests/worker/**/*.spec.ts"],
    setupFiles: ["./tests/worker/setup-d1.ts"],
    testTimeout: 30_000,
  },
});
