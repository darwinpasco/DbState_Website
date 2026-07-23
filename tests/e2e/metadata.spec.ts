import { expect, test } from "@playwright/test";
import { allStaticRoutes, docsArticles } from "./site";

const socialImagePath = "/social/dbstate-home-hero-v1.png";
const socialImageUrl = `https://dbstate.com${socialImagePath}`;

function readPngDimensions(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

test.describe("metadata", () => {
  for (const route of allStaticRoutes) {
    test(`${route.path} has required metadata`, async ({ page }) => {
      await page.goto(route.path);

      const title = await page.title();
      expect(title.trim()).not.toBe("");
      expect(title.toLowerCase()).not.toContain("placeholder");

      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
        "content",
        /width=device-width/,
      );
      await expect(
        page.locator('meta[name="description"]'),
      ).not.toHaveAttribute("content", "");
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex, nofollow",
      );
      await expect(page.locator('link[rel="icon"]')).toHaveCount(1);

      const canonical = page.locator('link[rel="canonical"]');
      if ((await canonical.count()) > 0) {
        const href = await canonical.first().getAttribute("href");
        expect(href).not.toContain("example.com");
        expect(() => new URL(href ?? "")).not.toThrow();
      }

      for (const selector of [
        'meta[property="og:url"]',
        'link[rel="canonical"]',
      ]) {
        const values = await page
          .locator(selector)
          .evaluateAll((elements) =>
            elements.map(
              (element) =>
                element.getAttribute("content") ??
                element.getAttribute("href") ??
                "",
            ),
          );
        expect(values.some((value) => value.includes("example.com"))).toBe(
          false,
        );
      }

      if (docsArticles.some((article) => article.path === route.path)) {
        expect(title).toContain("DbState Docs");
      }
    });
  }
});

test("homepage social metadata uses the committed hero preview image", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    socialImageUrl,
  );
  await expect(
    page.locator('meta[property="og:image:secure_url"]'),
  ).toHaveAttribute("content", socialImageUrl);
  await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute(
    "content",
    "image/png",
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
    "content",
    "1200",
  );
  await expect(
    page.locator('meta[property="og:image:height"]'),
  ).toHaveAttribute("content", "630");
  await expect(
    page.locator('meta[property="og:image:alt"]'),
  ).not.toHaveAttribute("content", "");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    socialImageUrl,
  );
  await expect(
    page.locator('meta[name="twitter:image:alt"]'),
  ).not.toHaveAttribute("content", "");

  const socialMetadataValues = await page
    .locator(
      'meta[property="og:image"], meta[property="og:image:secure_url"], meta[name="twitter:image"]',
    )
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("content") ?? ""),
    );
  for (const oldImageName of [
    "reference-data-diff",
    "schema-compare",
    "object-diff",
    "release-plan",
    "example.com",
  ]) {
    expect(socialMetadataValues.join("\n")).not.toContain(oldImageName);
  }

  const imageResponse = await page.request.get(socialImagePath);
  expect(imageResponse.ok()).toBe(true);
  expect(readPngDimensions(await imageResponse.body())).toEqual({
    width: 1200,
    height: 630,
  });
});
