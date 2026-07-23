import { expect, test } from "@playwright/test";
import {
  allStaticRoutes,
  expectCleanRenderedPage,
  expectSingleVisibleH1,
} from "./site";

test.describe("static routes", () => {
  for (const route of allStaticRoutes) {
    test(`${route.path} renders the expected page`, async ({ page }) => {
      const response = await page.goto(route.path);

      expect(response?.ok()).toBeTruthy();
      await expect(page.locator("main#main-content")).toBeVisible();
      await expectSingleVisibleH1(page, route.h1);
      await expectCleanRenderedPage(page);
    });
  }
});
