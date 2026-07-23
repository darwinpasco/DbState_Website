import { spawn, spawnSync } from "node:child_process";

const node = process.execPath;
const serverTtlMs = Number.parseInt(
  process.env.DBSTATE_PLAYWRIGHT_SERVER_TTL_MS ?? "45000",
  10,
);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false,
      windowsHide: true,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

await run(node, ["./scripts/astro-command.mjs", "build"]);

const preview = spawn(
  node,
  [
    "./scripts/astro-command.mjs",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4321",
  ],
  {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  },
);

function stopPreview() {
  if (preview.killed) {
    process.exit(0);
  }

  if (process.platform === "win32" && preview.pid) {
    spawnSync("taskkill", ["/pid", String(preview.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    process.exit(0);
  }

  if (!preview.killed) {
    preview.kill();
  }

  setTimeout(() => process.exit(0), 1_000).unref();
}

process.on("SIGINT", () => {
  stopPreview();
});

process.on("SIGTERM", () => {
  stopPreview();
});

preview.on("exit", (code) => {
  process.exit(code ?? 0);
});

preview.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

setTimeout(() => {
  stopPreview();
}, serverTtlMs).unref();
