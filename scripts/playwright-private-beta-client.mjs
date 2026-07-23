import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const executable = process.execPath;
const playwrightCli = fileURLToPath(
  new URL("../node_modules/@playwright/test/cli.js", import.meta.url),
);
const args = [
  playwrightCli,
  "test",
  "--config",
  "playwright.private-beta-client.config.ts",
  ...process.argv.slice(2),
];
const env = Object.fromEntries(
  Object.entries(process.env).filter((entry) => entry[1] !== undefined),
);
const focusedPort = "4322";

const child = spawn(executable, args, {
  cwd: process.cwd(),
  env: {
    ...env,
    DBSTATE_PRIVATE_BETA_CLIENT_PORT: focusedPort,
    PUBLIC_PRIVATE_BETA_INTAKE_MODE: "test",
    PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
  },
  stdio: "inherit",
  shell: false,
  windowsHide: true,
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
