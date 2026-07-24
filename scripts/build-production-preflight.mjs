import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const expectedPages = [
  "index.html",
  "product/index.html",
  "safety/index.html",
  "private-beta/index.html",
  "privacy/index.html",
  "docs/index.html",
  "docs/getting-started/index.html",
  "docs/workspace-setup/index.html",
  "docs/schema-compare/index.html",
  "docs/object-and-data-diff/index.html",
  "docs/reference-data/index.html",
  "docs/release-plans/index.html",
  "docs/safety-model/index.html",
  "docs/known-limitations/index.html",
  "404.html",
];

const socialImageUrl = "https://dbstate.com/social/dbstate-home-hero-v1.png";
const socialImageDistPath = join("dist", "social", "dbstate-home-hero-v1.png");

function fail(message) {
  console.error(`production preflight build failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function readPngDimensions(path) {
  const bytes = readFileSync(path);

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function listHtmlFiles(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listHtmlFiles(fullPath, relativePath);
    }

    return entry.isFile() && entry.name.endsWith(".html")
      ? [relativePath.replaceAll("\\", "/")]
      : [];
  });
}

function getMetaContent(html, attributeName, attributeValue) {
  const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedValue = attributeValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const forward = new RegExp(
    `<meta\\b(?=[^>]*\\b${escapedName}=["']${escapedValue}["'])(?=[^>]*\\bcontent=["']([^"']*)["'])[^>]*>`,
    "i",
  );
  const reverse = new RegExp(
    `<meta\\b(?=[^>]*\\bcontent=["']([^"']*)["'])(?=[^>]*\\b${escapedName}=["']${escapedValue}["'])[^>]*>`,
    "i",
  );

  return html.match(forward)?.[1] ?? html.match(reverse)?.[1] ?? "";
}

const inheritedMode = process.env.PUBLIC_PRIVATE_BETA_INTAKE_MODE;
if (inheritedMode && inheritedMode !== "disabled") {
  fail(
    `refusing to build production preflight with inherited PUBLIC_PRIVATE_BETA_INTAKE_MODE=${inheritedMode}`,
  );
}

const build = spawnSync(
  process.execPath,
  ["./scripts/astro-command.mjs", "build"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PUBLIC_PRIVATE_BETA_INTAKE_MODE: "disabled",
      SITE_URL: "https://dbstate.com",
    },
  },
);

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

for (const page of expectedPages) {
  assert(existsSync(join("dist", page)), `missing built page: ${page}`);
}

const htmlPages = listHtmlFiles("dist").sort();
assert(
  htmlPages.length === expectedPages.length,
  `expected ${expectedPages.length} static HTML pages, found ${htmlPages.length}: ${htmlPages.join(", ")}`,
);

const privateBetaHtml = readText(join("dist", "private-beta", "index.html"));
assert(
  privateBetaHtml.includes('data-private-beta-intake-mode="disabled"'),
  "/private-beta/ build must expose disabled public intake mode.",
);
assert(
  privateBetaHtml.includes("Application intake is currently closed"),
  "/private-beta/ build must show closed-intake wording.",
);
assert(
  /<button\b(?=[^>]*\bdisabled(?:\s|>|=))[^>]*>[\s\S]*?Application intake is currently closed[\s\S]*?<\/button>/i.test(
    privateBetaHtml,
  ),
  "/private-beta/ build must keep the submit button disabled.",
);
assert(
  !privateBetaHtml.includes(
    "https://challenges.cloudflare.com/turnstile/v0/api.js",
  ),
  "/private-beta/ disabled build must not load the Turnstile script.",
);
assert(
  !privateBetaHtml.includes("data-test-turnstile-widget"),
  "/private-beta/ disabled build must not render the Turnstile widget.",
);

assert(
  existsSync(socialImageDistPath),
  "missing social preview image in dist.",
);
assert(
  JSON.stringify(readPngDimensions(socialImageDistPath)) ===
    JSON.stringify({ width: 1200, height: 630 }),
  "social preview image must be 1200 x 630.",
);

const homeHtml = readText(join("dist", "index.html"));
assert(
  getMetaContent(homeHtml, "property", "og:image") === socialImageUrl,
  "homepage og:image must use the homepage hero social preview.",
);
assert(
  getMetaContent(homeHtml, "property", "og:image:secure_url") ===
    socialImageUrl,
  "homepage og:image:secure_url must use the homepage hero social preview.",
);
assert(
  getMetaContent(homeHtml, "name", "twitter:image") === socialImageUrl,
  "homepage twitter:image must use the homepage hero social preview.",
);
assert(
  getMetaContent(homeHtml, "name", "twitter:card") === "summary_large_image",
  "homepage twitter:card must remain summary_large_image.",
);

const socialMetadata = [
  getMetaContent(homeHtml, "property", "og:image"),
  getMetaContent(homeHtml, "property", "og:image:secure_url"),
  getMetaContent(homeHtml, "name", "twitter:image"),
].join("\n");

for (const oldImageName of [
  "reference-data-diff",
  "schema-compare",
  "object-diff",
  "release-plan",
]) {
  assert(
    !socialMetadata.includes(oldImageName),
    `social metadata must not reference ${oldImageName}.`,
  );
}

console.log(
  "Production preflight build verified: 15 static pages, disabled public intake, and homepage hero social metadata.",
);
