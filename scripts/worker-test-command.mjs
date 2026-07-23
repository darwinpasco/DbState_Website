import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const wranglerLogPath = path.join(process.cwd(), ".wrangler", "logs");
mkdirSync(wranglerLogPath, { recursive: true });

const vitestEntry = path.join(
  process.cwd(),
  "node_modules",
  "vitest",
  "vitest.mjs",
);

const child = spawn(process.execPath, [vitestEntry, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    WRANGLER_LOG_PATH: wranglerLogPath,
  },
  shell: false,
  stdio: "inherit",
  windowsHide: true,
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
