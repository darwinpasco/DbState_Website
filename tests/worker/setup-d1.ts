import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import { beforeAll, beforeEach } from "vitest";

beforeAll(async () => {
  await applyD1Migrations(env.PRIVATE_BETA_DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.PRIVATE_BETA_DB.prepare(
    "DELETE FROM private_beta_application_status_history",
  ).run();
  await env.PRIVATE_BETA_DB.prepare(
    "DELETE FROM private_beta_applications",
  ).run();
});
