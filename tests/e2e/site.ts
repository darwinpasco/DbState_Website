import { expect, type Page } from "@playwright/test";

export const postgreSqlLimitation =
  "Current Private Beta scope does not yet include procedures, aggregates, window functions, default privileges, database-level grants, column-level privileges, ownership changes, or role membership grants.";

export const docsArticles = [
  {
    path: "/docs/getting-started/",
    title: "Getting Started",
    section: "Start here",
  },
  {
    path: "/docs/workspace-setup/",
    title: "Workspace Setup",
    section: "Start here",
  },
  {
    path: "/docs/schema-compare/",
    title: "Schema Compare",
    section: "Schema workflows",
  },
  {
    path: "/docs/object-and-data-diff/",
    title: "Object and Data Diff",
    section: "Schema workflows",
  },
  {
    path: "/docs/reference-data/",
    title: "Reference Data",
    section: "Reference data",
  },
  {
    path: "/docs/release-plans/",
    title: "Release Plans",
    section: "Release preparation",
  },
  {
    path: "/docs/safety-model/",
    title: "Safety Model",
    section: "Trust and scope",
  },
  {
    path: "/docs/known-limitations/",
    title: "Known Limitations",
    section: "Trust and scope",
  },
] as const;

export const publicRoutes = [
  { path: "/", h1: "Database state, versioned in Git." },
  { path: "/product/", h1: "Database state belongs in the repository." },
  {
    path: "/safety/",
    h1: "Understand the change before anything is executed.",
  },
  {
    path: "/private-beta/",
    h1: "Evaluate DbState with a real PostgreSQL workflow.",
  },
  {
    path: "/privacy/",
    h1: "How Private Beta application information is handled.",
  },
  {
    path: "/docs/",
    h1: "Work with database state through explicit Git-managed workflows.",
  },
  ...docsArticles.map((article) => ({
    path: article.path,
    h1: article.title,
  })),
] as const;

export const allStaticRoutes = [
  ...publicRoutes,
  { path: "/404.html", h1: "This page does not exist." },
] as const;

export const responsivePages = [
  "/",
  "/product/",
  "/safety/",
  "/private-beta/",
  "/privacy/",
  "/docs/",
  "/docs/reference-data/",
  "/docs/release-plans/",
] as const;

export const viewportWidths = [390, 768, 1024, 1440] as const;

export async function expectCleanRenderedPage(page: Page) {
  const bodyText = await page.locator("body").innerText();

  expect(bodyText).not.toContain("Astro detected an error");
  expect(bodyText).not.toContain("Unhandled exception");
  expect(bodyText).not.toContain("<<<<<<<");
  expect(bodyText).not.toContain("=======");
  expect(bodyText).not.toContain(">>>>>>>");
}

export async function expectSingleVisibleH1(
  page: Page,
  expectedHeading: string,
) {
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.getByRole("heading", { level: 1, name: expectedHeading }),
  ).toBeVisible();
}

export async function expectNoHorizontalOverflow(page: Page) {
  const result = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const pageOverflow =
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth;
    const overflowThreshold = 1;
    const overflowingElements =
      pageOverflow > overflowThreshold
        ? Array.from(document.querySelectorAll("body *"))
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                tag: element.tagName.toLowerCase(),
                id: element.id,
                className: element.className.toString(),
                text:
                  element.textContent
                    ?.replace(/\s+/g, " ")
                    .trim()
                    .slice(0, 80) ?? "",
                left: Math.round(rect.left * 100) / 100,
                right: Math.round(rect.right * 100) / 100,
                width: Math.round(rect.width * 100) / 100,
                viewportWidth,
              };
            })
            .filter(
              (item) =>
                item.left < -overflowThreshold ||
                item.right > viewportWidth + overflowThreshold,
            )
            .slice(0, 12)
        : [];
    const fixedOrStickyOverflow = Array.from(document.querySelectorAll("*"))
      .map((element) => {
        const styles = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          text: element.textContent?.trim().slice(0, 60) ?? "",
          position: styles.position,
          left: rect.left,
          right: rect.right,
        };
      })
      .filter(
        (item) =>
          (item.position === "fixed" || item.position === "sticky") &&
          (item.left < -1 || item.right > viewportWidth + 1),
      );

    const wideFigures = Array.from(document.querySelectorAll("figure")).filter(
      (figure) => {
        const parent = figure.parentElement;
        if (!parent) {
          return false;
        }
        return (
          figure.getBoundingClientRect().width -
            parent.getBoundingClientRect().width >
          1
        );
      },
    ).length;

    return {
      pageOverflow,
      overflowingElements,
      fixedOrStickyOverflow,
      wideFigures,
    };
  });

  expect(
    result.pageOverflow,
    `Horizontal overflow offenders:\n${JSON.stringify(
      result.overflowingElements,
      null,
      2,
    )}`,
  ).toBeLessThanOrEqual(1);
  expect(result.fixedOrStickyOverflow).toEqual([]);
  expect(result.wideFigures).toBe(0);
}

export function normalizeInternalPath(pathname: string) {
  if (pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}
