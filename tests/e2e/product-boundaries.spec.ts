import { expect, test } from "@playwright/test";
import { postgreSqlLimitation } from "./site";

const boundaryPages = [
  "/",
  "/product/",
  "/safety/",
  "/private-beta/",
  "/docs/known-limitations/",
  "/docs/release-plans/",
] as const;

const unsupportedClaimPatterns = [
  /DbState automatically applies database changes/i,
  /DbState executes generated SQL/i,
  /one-click deployment/i,
  /automatic migration engine/i,
  /DbState performs automatic Git commits/i,
  /guaranteed compliance/i,
  /risk-free releases/i,
  /automatic rollback is included/i,
  /automatically synchronize/i,
] as const;

test("rendered copy preserves review-first product boundaries", async ({
  page,
}) => {
  for (const route of boundaryPages) {
    await page.goto(route);
    const text = await page.locator("body").innerText();

    for (const pattern of unsupportedClaimPatterns) {
      expect(text, `${route} matches unsupported claim ${pattern}`).not.toMatch(
        pattern,
      );
    }
  }
});

test("approved safety and limitation statements remain visible", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("body")).toContainText("No direct database apply.");
  await expect(page.locator("body")).toContainText(
    "No generated SQL execution.",
  );
  await expect(page.locator("body")).toContainText("No automatic Git commits.");

  for (const route of [
    "/product/",
    "/safety/",
    "/private-beta/",
    "/docs/known-limitations/",
  ]) {
    await page.goto(route);
    await expect(page.locator("body")).toContainText(postgreSqlLimitation);
  }
});
