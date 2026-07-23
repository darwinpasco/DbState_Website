import { readFileSync } from "node:fs";

const configText = readFileSync("wrangler.jsonc", "utf8");

function stripJsonComments(text) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (inString) {
      output += character;

      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      output += character;
      continue;
    }

    if (character === "/" && nextCharacter === "/") {
      while (index < text.length && text[index] !== "\n") {
        index += 1;
      }
      output += "\n";
      continue;
    }

    if (character === "/" && nextCharacter === "*") {
      index += 2;
      while (
        index < text.length &&
        !(text[index] === "*" && text[index + 1] === "/")
      ) {
        index += 1;
      }
      index += 1;
      continue;
    }

    output += character;
  }

  return output;
}

function stripTrailingCommas(text) {
  return text.replace(/,\s*([}\]])/g, "$1");
}

function fail(message) {
  console.error(`wrangler.jsonc validation failed: ${message}`);
  process.exit(1);
}

const config = JSON.parse(stripTrailingCommas(stripJsonComments(configText)));

if (config.name !== "dbstate-website") {
  fail("Worker name must remain dbstate-website.");
}

if (config.main !== "./worker/index.ts") {
  fail("Worker main must remain ./worker/index.ts.");
}

if (config.vars?.PRIVATE_BETA_INTAKE_MODE !== "disabled") {
  fail("PRIVATE_BETA_INTAKE_MODE must remain disabled.");
}

if (config.vars?.TURNSTILE_SITE_KEY !== "0x4AAAAAAD7ybcKG7AdVbfGm") {
  fail("TURNSTILE_SITE_KEY must match the provisioned public sitekey.");
}

if (config.vars?.TURNSTILE_EXPECTED_ACTION !== "private-beta-application") {
  fail("TURNSTILE_EXPECTED_ACTION must remain private-beta-application.");
}

const expectedHostnames = "dbstate.com,www.dbstate.com";
if (config.vars?.TURNSTILE_EXPECTED_HOSTNAMES !== expectedHostnames) {
  fail("TURNSTILE_EXPECTED_HOSTNAMES must be dbstate.com,www.dbstate.com.");
}

if ("TURNSTILE_SECRET_KEY" in (config.vars ?? {})) {
  fail("TURNSTILE_SECRET_KEY must not be stored in wrangler.jsonc vars.");
}

if ("secrets" in config && JSON.stringify(config.secrets).includes("0x")) {
  fail("wrangler.jsonc secrets configuration must not include secret values.");
}

const configTextWithoutSitekey = configText.replace(
  "0x4AAAAAAD7ybcKG7AdVbfGm",
  "",
);

if (/1x0+|2x0+|3x0+/.test(configTextWithoutSitekey)) {
  fail(
    "Production Wrangler configuration must not contain Turnstile test keys.",
  );
}

if (config.assets?.directory !== "./dist") {
  fail("assets.directory must remain ./dist.");
}

if (config.assets?.binding !== "ASSETS") {
  fail("assets.binding must remain ASSETS.");
}

const runWorkerFirst = config.assets?.run_worker_first;
if (
  !Array.isArray(runWorkerFirst) ||
  runWorkerFirst.length !== 1 ||
  runWorkerFirst[0] !== "/api/private-beta-applications"
) {
  fail(
    "assets.run_worker_first must target only /api/private-beta-applications.",
  );
}

const d1Databases = config.d1_databases;
if (!Array.isArray(d1Databases) || d1Databases.length !== 1) {
  fail("Exactly one D1 binding is required.");
}

const [privateBetaDb] = d1Databases;
const expectedD1 = {
  binding: "PRIVATE_BETA_DB",
  database_name: "dbstate-private-beta",
  database_id: "97cd3f79-cc4a-4b05-a397-05d6057ab38e",
  preview_database_id: "5b3e215c-0ecb-40eb-a4c4-794f913c9cee",
  migrations_dir: "migrations",
};

for (const [key, value] of Object.entries(expectedD1)) {
  if (privateBetaDb[key] !== value) {
    fail(`D1 ${key} must be ${value}.`);
  }
}

if ("remote" in privateBetaDb) {
  fail("D1 binding must not include remote.");
}

const forbiddenBindings = new Set([
  "dbstate_private_beta",
  "dbstate_private_beta_preview",
]);

if (forbiddenBindings.has(privateBetaDb.binding)) {
  fail(`Generated binding ${privateBetaDb.binding} must not be present.`);
}

console.log("wrangler.jsonc D1 and routing configuration is valid.");
