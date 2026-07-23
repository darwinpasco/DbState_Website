import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium } from "@playwright/test";

const node = process.execPath;
const port = "4330";
const previewUrl = `http://127.0.0.1:${port}/`;
const outputPath = resolve("public/social/dbstate-home-hero-v1.png");

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SITE_URL: "https://dbstate.com",
      },
      stdio: "inherit",
      shell: false,
      windowsHide: true,
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function waitForPreview() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(previewUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Preview is still starting.
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }

  throw new Error(`Astro preview did not respond at ${previewUrl}`);
}

function stopPreview(preview) {
  if (preview.killed) {
    return;
  }

  if (process.platform === "win32" && preview.pid) {
    spawnSync("taskkill", ["/pid", String(preview.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  preview.kill();
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
    port,
  ],
  {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  },
);
preview.unref();

try {
  await waitForPreview();
  mkdirSync(dirname(outputPath), { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 694 },
      deviceScaleFactor: 1,
      locale: "en-US",
      colorScheme: "dark",
      reducedMotion: "reduce",
    });

    await page.goto(previewUrl, { waitUntil: "networkidle" });
    await page.addStyleTag({
      content: `
        header {
          display: none !important;
        }

        body {
          margin: 0 !important;
          overflow: hidden !important;
        }

        .technical-grid > div {
          max-width: none !important;
          min-height: auto !important;
          padding: 56px !important;
          transform: scale(0.9);
          transform-origin: top left;
          width: 111.111111% !important;
        }
      `,
    });
    await page.evaluate(() => document.fonts.ready);

    await page.screenshot({
      path: outputPath,
      animations: "disabled",
      caret: "hide",
      clip: {
        x: 0,
        y: 0,
        width: 1200,
        height: 630,
      },
    });
  } finally {
    await browser.close();
  }
} finally {
  stopPreview(preview);
}

console.log(`Captured ${outputPath}`);
