import { expect, test } from "@playwright/test";

test("private beta questionnaire remains disabled and non-submitting", async ({
  context,
  page,
}) => {
  const postLoadRequests: string[] = [];

  await page.goto("/private-beta/");
  page.on("request", (request) => {
    postLoadRequests.push(request.url());
  });

  const form = page.locator("form").first();
  await expect(form).toBeVisible();
  await expect(form).toHaveAttribute(
    "data-private-beta-intake-mode",
    "disabled",
  );
  await expect(form).not.toHaveAttribute("action", /./);
  await expect(form).not.toHaveAttribute("method", /./);

  await expect(form.locator("fieldset")).toHaveCount(5);
  await expect(form.locator("legend")).toHaveCount(5);
  await expect(form.locator("input")).not.toHaveCount(0);
  await expect(form.locator("select")).toHaveCount(2);
  await expect(form.locator("textarea")).not.toHaveCount(0);
  await expect(form.locator("label")).not.toHaveCount(0);
  await expect(form.locator("text=required")).not.toHaveCount(0);

  const namedFields = await form
    .locator("input, select, textarea")
    .evaluateAll((fields) =>
      fields
        .map((field) => field.getAttribute("name"))
        .filter((name): name is string => Boolean(name)),
    );
  expect(namedFields).toContain("fullName");
  expect(namedFields).not.toContain("cf-turnstile-response");

  await expect(
    page.getByRole("button", {
      name: "Application intake is currently closed",
    }),
  ).toBeDisabled();

  await expect(page.locator("body")).toContainText(
    "The questionnaire can be reviewed, but submission is not currently available.",
  );
  await expect(page.locator("body")).toContainText(
    "No information entered on this page is transmitted to or stored by DbState while application intake is closed.",
  );
  await expect(
    page.getByRole("link", { name: "Privacy notice" }),
  ).toHaveAttribute("href", "/privacy/");
  await expect(page.locator("body")).toContainText(
    "Describe the last database change that was difficult to review, reproduce, or release.",
  );
  await expect(page.locator("body")).toContainText(
    "Do not submit credentials or production secrets.",
  );

  await page.locator("#name").fill("Test Evaluator");
  await page.locator("#work-email").fill("evaluator@example.invalid");
  await page
    .locator("#first-workflow")
    .selectOption("schema-repository-to-database");

  expect(postLoadRequests).toEqual([]);
  expect(await context.cookies()).toEqual([]);

  const pageSource = await page.content();
  expect(pageSource).not.toContain("/api/private-beta-applications");
  expect(pageSource).not.toContain("localStorage");
  expect(pageSource).not.toContain("sessionStorage");
  expect(pageSource).not.toContain("document.cookie");
  expect(pageSource).not.toMatch(/onsubmit=/i);
  expect(pageSource).not.toContain("challenges.cloudflare.com/turnstile");
  expect(pageSource).not.toContain("cf-turnstile");
});
