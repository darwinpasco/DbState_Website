import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  responsivePages,
  viewportWidths,
} from "./site";

test.describe("responsive layout", () => {
  for (const width of viewportWidths) {
    for (const route of responsivePages) {
      test(`${route} has no page overflow at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(route);

        await expect(page.getByRole("banner")).toBeVisible();
        await expect(page.locator("main#main-content")).toBeVisible();
        await expect(page.getByRole("contentinfo")).toBeVisible();
        await expectNoHorizontalOverflow(page);

        const technicalContentContained = await page.evaluate(() =>
          Array.from(document.querySelectorAll("pre, table")).every(
            (element) =>
              element.getBoundingClientRect().width <=
              document.documentElement.clientWidth + 1,
          ),
        );
        expect(technicalContentContained).toBe(true);
      });
    }
  }
});
