import { expect, test } from "@playwright/test";
import { allStaticRoutes, docsArticles } from "./site";

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
