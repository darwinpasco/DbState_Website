const baseUrl = new URL("https://dbstate.com");
const socialImagePath = "/social/dbstate-home-hero-v1.png";
const socialImageUrl = new URL(socialImagePath, baseUrl).toString();

const publicPages = [
  "/",
  "/product/",
  "/safety/",
  "/private-beta/",
  "/docs/",
  "/privacy/",
  "/404.html",
];

function fail(message) {
  console.error(`production preflight verification failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
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

async function fetchText(path) {
  const response = await fetch(new URL(path, baseUrl), {
    cache: "no-store",
  });
  assert(response.ok, `${path} returned HTTP ${response.status}.`);
  return response.text();
}

async function fetchBytes(path) {
  const response = await fetch(new URL(path, baseUrl), {
    cache: "no-store",
  });
  assert(response.ok, `${path} returned HTTP ${response.status}.`);
  return new Uint8Array(await response.arrayBuffer());
}

function readPngDimensions(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

for (const page of publicPages) {
  const html = await fetchText(page);
  assert(
    !html.includes("Astro detected an error"),
    `${page} has Astro error text.`,
  );
  assert(!html.includes("Unhandled exception"), `${page} has exception text.`);
  assert(!html.includes("<<<<<<<"), `${page} has merge conflict markers.`);
  if (page === "/404.html") {
    assert(
      html.includes("This page does not exist."),
      "/404.html must render the expected static 404 page.",
    );
  }
}

const homeHtml = await fetchText("/");
assert(
  getMetaContent(homeHtml, "property", "og:image") === socialImageUrl,
  "homepage og:image must reference the homepage hero social preview.",
);
assert(
  getMetaContent(homeHtml, "name", "twitter:image") === socialImageUrl,
  "homepage twitter:image must reference the homepage hero social preview.",
);
assert(
  getMetaContent(homeHtml, "name", "twitter:card") === "summary_large_image",
  "homepage twitter:card must be summary_large_image.",
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

assert(
  JSON.stringify(readPngDimensions(await fetchBytes(socialImagePath))) ===
    JSON.stringify({ width: 1200, height: 630 }),
  "social preview image must be 1200 x 630.",
);

const privateBetaHtml = await fetchText("/private-beta/");
assert(
  privateBetaHtml.includes('data-private-beta-intake-mode="disabled"'),
  "/private-beta/ must report disabled public mode.",
);
assert(
  privateBetaHtml.includes("Application intake is currently closed"),
  "/private-beta/ must show closed-intake wording.",
);
assert(
  /<button\b(?=[^>]*\bdisabled(?:\s|>|=))[^>]*>[\s\S]*?Application intake is currently closed[\s\S]*?<\/button>/i.test(
    privateBetaHtml,
  ),
  "/private-beta/ submit control must be disabled.",
);
assert(
  !privateBetaHtml.includes(
    "https://challenges.cloudflare.com/turnstile/v0/api.js",
  ),
  "/private-beta/ must not load the Turnstile client script while closed.",
);
assert(
  !privateBetaHtml.includes("data-test-turnstile-widget"),
  "/private-beta/ must not render a Turnstile widget while closed.",
);

const apiResponse = await fetch(
  new URL("/api/private-beta-applications", baseUrl),
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: "{}",
    cache: "no-store",
  },
);
assert(
  apiResponse.status === 503,
  `/api/private-beta-applications must return 503 while intake is disabled, received ${apiResponse.status}.`,
);
const apiBody = await apiResponse.json();
assert(
  apiBody?.error?.code === "intake_disabled",
  "disabled API response must use intake_disabled.",
);

const privacyHtml = await fetchText("/privacy/");
for (const expectedText of [
  "Public application intake remains closed.",
  "Automated retention enforcement has been implemented but remains disabled",
  "The APAC operating region is not presented as a legally guaranteed data-residency commitment.",
]) {
  assert(
    privacyHtml.includes(expectedText),
    `/privacy/ must contain: ${expectedText}`,
  );
}

console.log(
  "Production preflight verification passed: public pages, social metadata, closed intake, disabled API, and privacy wording.",
);
