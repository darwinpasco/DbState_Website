import { expect, test } from "@playwright/test";

const screenshotTitles = [
  "Schema Compare",
  "Object Diff",
  "Reference Data Diff",
  "Release Plan",
] as const;

for (const route of ["/", "/product/"] as const) {
  test(`${route} renders product screenshots with accessible figures`, async ({
    page,
  }) => {
    await page.goto(route);

    for (const title of screenshotTitles) {
      const figure = page
        .locator("figure")
        .filter({ has: page.locator("figcaption") })
        .filter({ hasText: title })
        .first();
      await expect(figure).toBeVisible();
      await figure.scrollIntoViewIfNeeded();
      await expect(figure.locator("figcaption")).toBeVisible();

      const image = figure.getByRole("img").first();
      await expect(image).toBeVisible();
      await expect
        .poll(() =>
          image.evaluate((img) => (img as HTMLImageElement).naturalWidth),
        )
        .toBeGreaterThan(0);
      const alt = await image.getAttribute("alt");
      expect(alt?.trim()).toBeTruthy();

      const ratio = await image.evaluate((img) => {
        const imageElement = img as HTMLImageElement;
        return {
          naturalRatio: imageElement.naturalWidth / imageElement.naturalHeight,
          renderedRatio:
            imageElement.getBoundingClientRect().width /
            imageElement.getBoundingClientRect().height,
          imageWidth: imageElement.getBoundingClientRect().width,
          containerWidth:
            imageElement.parentElement?.getBoundingClientRect().width ?? 0,
        };
      });
      expect(ratio.naturalRatio).toBeGreaterThan(1.58);
      expect(ratio.naturalRatio).toBeLessThan(1.62);
      expect(ratio.renderedRatio).toBeGreaterThan(1.55);
      expect(ratio.renderedRatio).toBeLessThan(1.65);
      expect(ratio.imageWidth).toBeLessThanOrEqual(ratio.containerWidth + 1);

      const fullSizeLink = figure
        .getByRole("link", {
          name: new RegExp(`Open full-size ${title} screenshot`),
        })
        .last();
      await expect(fullSizeLink).toBeVisible();
      await fullSizeLink.focus();
      await expect(fullSizeLink).toBeFocused();
    }

    const releasePlanCaption = page
      .locator("figure")
      .filter({ has: page.locator("figcaption") })
      .filter({ hasText: "Release Plan" })
      .first()
      .locator("figcaption");
    await expect(releasePlanCaption).not.toContainText(/successful dry-run/i);
    await expect(releasePlanCaption).not.toContainText(/deployment/i);
    await expect(releasePlanCaption).not.toContainText(/generated SQL/i);
    await expect(releasePlanCaption).toContainText(
      "before any database execution occurs outside DbState",
    );
  });
}
