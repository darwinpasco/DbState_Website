import { readFileSync } from "node:fs";

const configText = readFileSync("wrangler.jsonc", "utf8");
const siteMetadataText = readFileSync("src/data/site.ts", "utf8");
const astroConfigText = readFileSync("astro.config.mjs", "utf8");

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

if (config.vars?.PRIVATE_BETA_NOTIFICATION_TO !== "darwin@dbstate.com") {
  fail("PRIVATE_BETA_NOTIFICATION_TO must remain darwin@dbstate.com.");
}

if (config.vars?.PRIVATE_BETA_EMAIL_FROM !== "private-beta@dbstate.com") {
  fail("PRIVATE_BETA_EMAIL_FROM must remain private-beta@dbstate.com.");
}

if (config.vars?.PRIVATE_BETA_EMAIL_REPLY_TO !== "darwin@dbstate.com") {
  fail("PRIVATE_BETA_EMAIL_REPLY_TO must remain darwin@dbstate.com.");
}

if (config.vars?.PRIVATE_BETA_RETENTION_ENFORCEMENT_MODE !== "disabled") {
  fail("PRIVATE_BETA_RETENTION_ENFORCEMENT_MODE must remain disabled.");
}

if (config.vars?.PRIVATE_BETA_RETENTION_BATCH_SIZE !== "100") {
  fail("PRIVATE_BETA_RETENTION_BATCH_SIZE must remain 100.");
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

const requiredSecrets = config.secrets?.required;
if (
  !Array.isArray(requiredSecrets) ||
  requiredSecrets.length !== 1 ||
  requiredSecrets[0] !== "TURNSTILE_SECRET_KEY"
) {
  fail("secrets.required must contain only TURNSTILE_SECRET_KEY.");
}

if (Object.keys(config.secrets ?? {}).some((key) => key !== "required")) {
  fail(
    "wrangler.jsonc secrets configuration must contain only required names.",
  );
}

if (JSON.stringify(config.secrets).includes("0x")) {
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

const emailBindings = config.send_email;
if (!Array.isArray(emailBindings) || emailBindings.length !== 1) {
  fail("Exactly one send_email binding is required.");
}

const [privateBetaEmail] = emailBindings;
if (privateBetaEmail.name !== "PRIVATE_BETA_EMAIL") {
  fail("Email binding name must remain PRIVATE_BETA_EMAIL.");
}

if (privateBetaEmail.destination_address !== "darwin@dbstate.com") {
  fail("Email binding destination_address must remain darwin@dbstate.com.");
}

if (
  !Array.isArray(privateBetaEmail.allowed_sender_addresses) ||
  privateBetaEmail.allowed_sender_addresses.length !== 1 ||
  privateBetaEmail.allowed_sender_addresses[0] !== "private-beta@dbstate.com"
) {
  fail(
    "Email binding allowed_sender_addresses must contain only private-beta@dbstate.com.",
  );
}

if ("remote" in privateBetaEmail) {
  fail("Email binding must not include remote.");
}

const crons = config.triggers?.crons;
if (!Array.isArray(crons) || crons.length !== 1 || crons[0] !== "17 3 * * *") {
  fail("Exactly one Cron Trigger is required: 17 3 * * *.");
}

const forbiddenTopLevelBindings = [
  "kv_namespaces",
  "r2_buckets",
  "queues",
  "durable_objects",
  "workflows",
  "ai",
  "vectorize",
];

for (const key of forbiddenTopLevelBindings) {
  if (key in config) {
    fail(`${key} must not be configured for this Worker.`);
  }
}

if (!astroConfigText.includes('"https://dbstate.com"')) {
  fail("Astro canonical site must remain https://dbstate.com.");
}

if (
  !siteMetadataText.includes(
    'defaultSocialImagePath: "/social/dbstate-home-hero-v1.png"',
  )
) {
  fail(
    "Default social image path must remain /social/dbstate-home-hero-v1.png.",
  );
}

if (!siteMetadataText.includes("socialImageWidth: 1200")) {
  fail("Default social image width must remain 1200.");
}

if (!siteMetadataText.includes("socialImageHeight: 630")) {
  fail("Default social image height must remain 630.");
}

console.log(
  "wrangler.jsonc D1, email, retention, Cron, required-secret, social metadata, and routing configuration is valid.",
);
