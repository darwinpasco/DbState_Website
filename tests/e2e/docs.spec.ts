import { expect, test } from "@playwright/test";
import { docsArticles, postgreSqlLimitation } from "./site";

test("documentation landing and sidebar list all articles", async ({
  page,
}) => {
  await page.goto("/docs/");

  for (const article of docsArticles) {
    await expect(
      page.locator(`a[href="${article.path}"]`).first(),
    ).toBeVisible();
  }

  await page.goto("/docs/reference-data/");
  const sidebar = page.getByRole("navigation", {
    name: "Documentation navigation",
  });

  for (const article of docsArticles) {
    await expect(
      sidebar.getByRole("link", { name: article.title }),
    ).toBeVisible();
  }
  await expect(
    sidebar.getByRole("link", { name: "Reference Data" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(sidebar).not.toContainText("Draft");
});

test("previous and next navigation follows documentation order", async ({
  page,
}) => {
  await page.goto(docsArticles[0].path);
  await expect(
    page.getByRole("navigation", { name: "Documentation pagination" }),
  ).not.toContainText("Previous");
  await expect(
    page.getByRole("link", { name: /Next Workspace Setup/ }),
  ).toBeVisible();

  for (let index = 1; index < docsArticles.length - 1; index += 1) {
    await page.goto(docsArticles[index].path);
    await expect(
      page.getByRole("link", {
        name: new RegExp(`Previous ${docsArticles[index - 1].title}`),
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: new RegExp(`Next ${docsArticles[index + 1].title}`),
      }),
    ).toBeVisible();
  }

  await page.goto(docsArticles[docsArticles.length - 1].path);
  await expect(
    page.getByRole("link", {
      name: new RegExp(
        `Previous ${docsArticles[docsArticles.length - 2].title}`,
      ),
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Documentation pagination" }),
  ).not.toContainText("Next");
});

test("documentation technical content and scope statements render", async ({
  page,
}) => {
  await page.goto("/docs/reference-data/");
  await expect(
    page.locator("pre code").filter({ hasText: "version: 1" }),
  ).toBeVisible();
  await expect(
    page.locator("pre code").filter({ hasText: "country_id" }),
  ).not.toHaveCount(0);

  await page.goto("/docs/workspace-setup/");
  await expect(
    page.locator("pre code").filter({ hasText: "database/" }),
  ).toBeVisible();

  await page.goto("/docs/known-limitations/");
  await expect(page.locator("body")).toContainText(postgreSqlLimitation);
  await expect(
    page.locator("#main-content").getByRole("link", { name: "Product" }),
  ).toBeVisible();
  await expect(
    page
      .locator("#main-content")
      .getByRole("link", { name: "request Private Beta access" }),
  ).toBeVisible();

  await page.goto("/docs/release-plans/");
  await expect(page.locator("body")).toContainText(
    "Database execution remains outside DbState.",
  );
});
