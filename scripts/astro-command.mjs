import { spawn } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const astroBin = path.join(
  process.cwd(),
  "node_modules",
  "astro",
  "bin",
  "astro.mjs",
);

const child = spawn(process.execPath, [astroBin, ...args], {
  env: {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: "1",
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
