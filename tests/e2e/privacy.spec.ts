import { expect, test } from "@playwright/test";

test("privacy page discloses applicant data lifecycle without unsupported claims", async ({
  page,
}) => {
  await page.goto("/privacy/");

  await expect(page).toHaveTitle("Privacy | DbState");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "How DbState handles website and Private Beta application information, including application purpose, Cloudflare processing, retention, consent, correction, and deletion requests.",
  );

  const body = page.locator("body");
  await expect(body).toContainText(
    "Private Beta application records are assigned a retention date 365 days after submission.",
  );
  await expect(body).toContainText(
    "The APAC operating region is not presented as a legally guaranteed data-residency commitment.",
  );
  await expect(body).toContainText(
    "Automated retention enforcement has been implemented but remains disabled until the Private Beta application process is activated and operationally verified. Public application intake remains closed.",
  );
  await expect(body).toContainText(
    "No security measure can guarantee that an incident will never occur.",
  );
  await expect(
    page.getByRole("link", { name: "darwin@dbstate.com" }),
  ).toHaveAttribute("href", "mailto:darwin@dbstate.com");
  await expect(
    page.getByRole("link", { name: "Cloudflare Turnstile Privacy Addendum" }),
  ).toHaveAttribute(
    "href",
    "https://www.cloudflare.com/turnstile-privacy-policy/",
  );

  const renderedText = await body.innerText();
  for (const unsupportedClaim of [
    "GDPR compliant",
    "PDPA compliant",
    "DPA compliant",
    "Privacy certified",
    "registered office",
    "company registration number",
    "Singapore legal entity",
    "privacy officer",
    "guaranteed to remain in APAC",
    "always remains in APAC",
    "always remains in Singapore",
    "always remains in the Philippines",
  ]) {
    expect(renderedText).not.toContain(unsupportedClaim);
  }
});
