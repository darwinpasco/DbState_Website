import { expect, test } from "@playwright/test";
import { docsArticles, normalizeInternalPath, publicRoutes } from "./site";

test("internal links resolve and same-page fragments exist", async ({
  page,
  request,
}) => {
  const checkedDestinations = new Set<string>();

  for (const route of publicRoutes) {
    await page.goto(route.path);
    const currentUrl = new URL(page.url());
    const links = await page.locator("a[href]").evaluateAll((anchors) =>
      anchors.map((anchor) => ({
        text: anchor.textContent?.trim() ?? "",
        href: anchor.getAttribute("href") ?? "",
      })),
    );

    for (const link of links) {
      if (!link.href || link.href.startsWith("mailto:")) {
        continue;
      }

      const url = new URL(link.href, currentUrl);

      if (
        url.origin !== currentUrl.origin ||
        !url.protocol.startsWith("http")
      ) {
        continue;
      }

      if (link.href.startsWith("#")) {
        const exists = await page.evaluate(
          (id) => Boolean(document.getElementById(id)),
          decodeURIComponent(url.hash.slice(1)),
        );
        expect(exists, `${route.path} has missing fragment ${link.href}`).toBe(
          true,
        );
        continue;
      }

      const destinationKey = `${url.pathname}${url.hash}`;
      if (checkedDestinations.has(destinationKey)) {
        continue;
      }
      checkedDestinations.add(destinationKey);

      const response = await request.get(`${url.pathname}${url.search}`);
      expect(
        response.status(),
        `${route.path} links to ${link.href} with text "${link.text}"`,
      ).toBeLessThan(400);

      if (url.hash) {
        await page.goto(`${url.pathname}${url.hash}`);
        const exists = await page.evaluate(
          (id) => Boolean(document.getElementById(id)),
          decodeURIComponent(url.hash.slice(1)),
        );
        expect(
          exists,
          `${route.path} links to missing fragment ${url.pathname}${url.hash}`,
        ).toBe(true);
      }
    }
  }
});

test("skip link, header, footer, anchors, and docs pager are navigable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/");

  const skipLink = page.locator("a.skip-link");
  await expect(skipLink).toHaveAttribute("href", "#main-content");
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeVisible();

  const primaryNav = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  for (const label of ["Product", "Safety", "Docs", "Private Beta"]) {
    await expect(primaryNav.getByRole("link", { name: label })).toBeVisible();
  }

  await page.goto("/");
  const focusedLinks: string[] = [];
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab");
    focusedLinks.push(
      await page.evaluate(
        () => document.activeElement?.textContent?.trim() ?? "",
      ),
    );
  }
  expect(focusedLinks.join(" ")).toContain("Product");
  expect(focusedLinks.join(" ")).toContain("Request Private Beta Access");

  const footerNav = page.getByRole("navigation", { name: "Footer navigation" });
  await footerNav.getByRole("link", { name: "Docs" }).click();
  expect(normalizeInternalPath(new URL(page.url()).pathname)).toBe("/docs/");

  await page.goto("/product/#workflow-model");
  await expect(page.locator("#workflow-model")).toBeVisible();

  await page.goto("/private-beta/#application");
  await expect(page.locator("#application")).toBeVisible();

  await page.goto("/docs/schema-compare/");
  await expect(
    page
      .getByRole("navigation", { name: "Documentation navigation" })
      .getByRole("link", { name: "Schema Compare" }),
  ).toHaveAttribute("aria-current", "page");

  await page.getByRole("link", { name: /Next Object and Data Diff/ }).click();
  expect(normalizeInternalPath(new URL(page.url()).pathname)).toBe(
    "/docs/object-and-data-diff/",
  );

  for (const article of docsArticles) {
    await page.goto(article.path);
    await expect(
      page
        .getByRole("navigation", { name: "Documentation navigation" })
        .getByRole("link", { name: article.title }),
    ).toHaveAttribute("aria-current", "page");
  }
});
