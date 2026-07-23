import { expect, test, type Page, type Route } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./site";

const turnstileScriptUrl =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const expectedFields = [
  "fullName",
  "workEmail",
  "companyTeamOrProject",
  "role",
  "postgresqlVersions",
  "windowsVersion",
  "otherDatabaseEngines",
  "gitWorkflow",
  "schemaChangeProcess",
  "referenceDataProcess",
  "databaseReviewers",
  "releaseSqlProcess",
  "difficultChange",
  "firstWorkflow",
  "importantObjectTypes",
  "managesReferenceDataInGit",
  "evaluationGoals",
  "processingConsent",
  "futureUpdatesOptIn",
];

const validAnswers = {
  fullName: "Test Evaluator",
  workEmail: "evaluator@example.invalid",
  companyTeamOrProject: "Example database team",
  role: "Database engineer",
  postgresqlVersions: "PostgreSQL 16",
  windowsVersion: "Windows 11",
  schemaChangeProcess:
    "Schema changes are reviewed beside application code before release.",
  referenceDataProcess:
    "Reference data is reviewed manually through scripts and spreadsheets.",
  databaseReviewers: "Application developers and database engineers",
  releaseSqlProcess:
    "Release SQL is prepared manually and executed outside application code.",
  difficultChange:
    "A lookup-table and schema update was difficult to review across environments.",
  firstWorkflow: "schema-repository-to-database",
  importantObjectTypes: "Tables, constraints, views, grants, reference data",
  managesReferenceDataInGit: "partially",
  evaluationGoals:
    "Evaluate whether repository desired state makes review clearer.",
};

type TurnstileState = {
  rendered: Array<Record<string, string>>;
  token: string;
  resetCount: number;
  removeCount: number;
  succeed: (token?: string) => void;
  expire: () => void;
  error: () => void;
  timeout: () => void;
};

async function installTurnstileMock(page: Page) {
  const scriptRequests: string[] = [];

  await page.route(turnstileScriptUrl, async (route) => {
    scriptRequests.push(route.request().url());
    await route.fulfill({
      contentType: "application/javascript",
      body: `
        (() => {
          const state = {
            rendered: [],
            token: "",
            resetCount: 0,
            removeCount: 0,
            callbacks: null,
            succeed(token = "TEST.TURNSTILE.TOKEN") {
              state.token = token;
              state.callbacks?.callback(token);
            },
            expire() {
              state.token = "";
              state.callbacks?.["expired-callback"]();
            },
            error() {
              state.token = "";
              state.callbacks?.["error-callback"]();
            },
            timeout() {
              state.token = "";
              state.callbacks?.["timeout-callback"]();
            }
          };
          window.__dbstateTurnstile = state;
          window.turnstile = {
            render(container, options) {
              state.callbacks = options;
              state.rendered.push({
                sitekey: options.sitekey,
                action: options.action,
                theme: options.theme,
                size: options.size
              });
              const element = typeof container === "string"
                ? document.querySelector(container)
                : container;
              if (element) {
                element.setAttribute("data-test-turnstile-widget", "rendered");
              }
              return "widget-1";
            },
            reset() {
              state.token = "";
              state.resetCount += 1;
            },
            remove() {
              state.token = "";
              state.removeCount += 1;
            },
            getResponse() {
              return state.token;
            }
          };
        })();
      `,
    });
  });

  return scriptRequests;
}

async function getTurnstileState(page: Page) {
  return page.evaluate(() => {
    const state = (
      window as typeof window & { __dbstateTurnstile?: TurnstileState }
    ).__dbstateTurnstile;

    if (!state) {
      return null;
    }

    return {
      rendered: state.rendered,
      token: state.token,
      resetCount: state.resetCount,
      removeCount: state.removeCount,
    };
  });
}

async function completeTurnstile(page: Page, token = "TEST.TURNSTILE.TOKEN") {
  await page.evaluate((nextToken) => {
    (
      window as typeof window & { __dbstateTurnstile: TurnstileState }
    ).__dbstateTurnstile.succeed(nextToken);
  }, token);
}

async function fillValidForm(page: Page) {
  await page.locator('[name="fullName"]').fill(validAnswers.fullName);
  await page.locator('[name="workEmail"]').fill(validAnswers.workEmail);
  await page
    .locator('[name="companyTeamOrProject"]')
    .fill(validAnswers.companyTeamOrProject);
  await page.locator('[name="role"]').fill(validAnswers.role);
  await page
    .locator('[name="postgresqlVersions"]')
    .fill(validAnswers.postgresqlVersions);
  await page
    .locator('[name="windowsVersion"]')
    .fill(validAnswers.windowsVersion);
  await page
    .locator('[name="schemaChangeProcess"]')
    .fill(validAnswers.schemaChangeProcess);
  await page
    .locator('[name="referenceDataProcess"]')
    .fill(validAnswers.referenceDataProcess);
  await page
    .locator('[name="databaseReviewers"]')
    .fill(validAnswers.databaseReviewers);
  await page
    .locator('[name="releaseSqlProcess"]')
    .fill(validAnswers.releaseSqlProcess);
  await page
    .locator('[name="difficultChange"]')
    .fill(validAnswers.difficultChange);
  await page
    .locator('[name="firstWorkflow"]')
    .selectOption(validAnswers.firstWorkflow);
  await page
    .locator('[name="importantObjectTypes"]')
    .fill(validAnswers.importantObjectTypes);
  await page
    .locator('[name="managesReferenceDataInGit"]')
    .selectOption(validAnswers.managesReferenceDataInGit);
  await page
    .locator('[name="evaluationGoals"]')
    .fill(validAnswers.evaluationGoals);
  await page.locator('[name="processingConsent"]').check();
}

async function openTestModeForm(page: Page) {
  const scriptRequests = await installTurnstileMock(page);
  await page.goto("/private-beta/");

  const form = page.locator("[data-private-beta-application-form]");
  const mode = await form.getAttribute("data-private-beta-intake-mode");
  if (mode !== "test") {
    throw new Error(
      `Expected Private Beta intake mode "test", but received "${mode ?? "missing"}". The focused client suite must run against its dedicated test-mode Astro preview on port 4322.`,
    );
  }

  await expect(page.locator("[data-test-turnstile-widget]")).toBeVisible();
  return scriptRequests;
}

function apiJsonResponse(body: unknown, status: number) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

test("test mode renders Turnstile explicitly and handles callbacks", async ({
  page,
}) => {
  const scriptRequests = await openTestModeForm(page);

  expect(scriptRequests).toEqual([turnstileScriptUrl]);
  await expect(
    page.getByRole("button", { name: "Submit Private Beta application" }),
  ).toBeDisabled();

  const state = await getTurnstileState(page);
  expect(state?.rendered).toEqual([
    {
      sitekey: "1x00000000000000000000AA",
      action: "private-beta-application",
      theme: "dark",
      size: "flexible",
    },
  ]);

  await completeTurnstile(page);
  await expect(page.locator("[data-turnstile-status]")).toContainText(
    "Verification complete.",
  );
  await expect(
    page.getByRole("button", { name: "Submit Private Beta application" }),
  ).toBeEnabled();

  await page.evaluate(() => {
    (
      window as typeof window & { __dbstateTurnstile: TurnstileState }
    ).__dbstateTurnstile.expire();
  });
  await expect(
    page.getByRole("button", { name: "Submit Private Beta application" }),
  ).toBeDisabled();
  await expect(page.locator("[data-turnstile-status]")).toContainText(
    "Verification expired.",
  );

  await completeTurnstile(page, "SECOND.TOKEN");
  await page.evaluate(() => {
    (
      window as typeof window & { __dbstateTurnstile: TurnstileState }
    ).__dbstateTurnstile.error();
  });
  await expect(
    page.getByRole("button", { name: "Submit Private Beta application" }),
  ).toBeDisabled();
  await expect(page.locator("[data-turnstile-status]")).toContainText(
    "verification could not be confirmed",
  );
});

test("form contract submits same-origin JSON with exact fields", async ({
  page,
}) => {
  await openTestModeForm(page);
  const apiRequests: Record<string, unknown>[] = [];
  const fieldNames = await page
    .locator("input, select, textarea")
    .evaluateAll((fields) =>
      fields
        .map((field) => field.getAttribute("name"))
        .filter((name): name is string => Boolean(name))
        .sort(),
    );

  expect(fieldNames).toEqual([...expectedFields].sort());

  await page.route("**/api/private-beta-applications", async (route) => {
    apiRequests.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill(
      apiJsonResponse(
        {
          applicationReference: "DBS-PB-ABCDEF123456",
          status: "received",
          submittedAt: "2026-07-23T00:00:00.000Z",
        },
        201,
      ),
    );
  });

  await fillValidForm(page);
  await page.locator('[name="futureUpdatesOptIn"]').check();
  await completeTurnstile(page, "CLIENT.TEST.TOKEN");
  await page
    .getByRole("button", { name: "Submit Private Beta application" })
    .click();

  expect(apiRequests).toHaveLength(1);
  expect(apiRequests[0]).toEqual({
    ...validAnswers,
    processingConsent: true,
    futureUpdatesOptIn: true,
    turnstileToken: "CLIENT.TEST.TOKEN",
  });
  expect(apiRequests[0]).not.toHaveProperty("otherDatabaseEngines");
  expect(apiRequests[0]).not.toHaveProperty("gitWorkflow");

  await expect(
    page.getByRole("heading", { name: "Application received." }),
  ).toBeVisible();
  await expect(page.locator("[data-application-reference]")).toHaveText(
    "DBS-PB-ABCDEF123456",
  );
  await expect(page.locator("body")).not.toContainText("application_id");
  await expect(
    page.getByRole("button", { name: "Submit Private Beta application" }),
  ).toBeDisabled();

  const state = await getTurnstileState(page);
  expect(state?.token).toBe("");
  expect(state?.removeCount).toBe(1);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
  expect(page.url()).not.toContain("CLIENT.TEST.TOKEN");
});

test("required fields, email, and processing consent prevent submission", async ({
  page,
}) => {
  await openTestModeForm(page);
  const apiRequests: string[] = [];
  await page.route("**/api/private-beta-applications", async (route) => {
    apiRequests.push(route.request().url());
    await route.abort();
  });

  await completeTurnstile(page);
  await page
    .getByRole("button", { name: "Submit Private Beta application" })
    .click();

  await expect(page.locator("[data-error-summary]")).toBeVisible();
  await expect(page.locator("[data-error-summary]")).toContainText(
    "Check the required fields.",
  );
  await expect(page.locator('[name="fullName"]')).toBeFocused();

  await fillValidForm(page);
  await page.locator('[name="workEmail"]').fill("not-an-email");
  await page
    .getByRole("button", { name: "Submit Private Beta application" })
    .click();

  await expect(page.locator("[data-error-summary]")).toContainText(
    "Check the required fields.",
  );
  await expect(page.locator('[name="workEmail"]')).toHaveAttribute(
    "aria-invalid",
    "true",
  );

  await page.locator('[name="workEmail"]').fill(validAnswers.workEmail);
  await page.locator('[name="processingConsent"]').uncheck();
  await page
    .getByRole("button", { name: "Submit Private Beta application" })
    .click();

  await expect(page.locator('[name="processingConsent"]')).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(apiRequests).toEqual([]);
});

test("server field errors map to controls and reset verification", async ({
  page,
}) => {
  await openTestModeForm(page);
  await page.route("**/api/private-beta-applications", async (route) => {
    await route.fulfill(
      apiJsonResponse(
        {
          error: {
            code: "validation_failed",
            message: "Application request validation failed.",
            fields: {
              workEmail: "Enter a valid work email address.",
            },
          },
        },
        422,
      ),
    );
  });

  await fillValidForm(page);
  await completeTurnstile(page);
  await page
    .getByRole("button", { name: "Submit Private Beta application" })
    .click();

  await expect(page.locator("[data-error-summary]")).toBeFocused();
  await expect(page.locator("[data-error-summary]")).toContainText(
    "Enter a valid work email address.",
  );
  await expect(page.locator('[name="workEmail"]')).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator('[name="fullName"]')).toHaveValue(
    validAnswers.fullName,
  );

  const state = await getTurnstileState(page);
  expect(state?.resetCount).toBeGreaterThanOrEqual(1);
  await expect(
    page.getByRole("button", { name: "Submit Private Beta application" }),
  ).toBeDisabled();
});

test("recoverable API failures preserve answers and require fresh verification", async ({
  page,
}) => {
  const cases = [
    [
      "duplicate",
      409,
      {
        error: {
          code: "duplicate_application",
          message:
            "An application from this email address was already received recently.",
        },
      },
      "An application from this email address was already received recently.",
    ],
    [
      "invalid turnstile",
      422,
      {
        error: {
          code: "turnstile_invalid",
          message:
            "The verification could not be confirmed. Refresh the verification and try again.",
        },
      },
      "verification could not be confirmed",
    ],
    [
      "intake disabled",
      503,
      {
        error: {
          code: "intake_disabled",
          message: "Private Beta application intake is not currently enabled.",
        },
      },
      "Application intake is currently closed.",
    ],
    [
      "verification unavailable",
      503,
      {
        error: {
          code: "turnstile_unavailable",
          message:
            "Application verification is temporarily unavailable. Try again later.",
        },
      },
      "temporarily unavailable",
    ],
    [
      "generic failure",
      500,
      {
        error: {
          code: "persistence_failed",
          message: "Private Beta application could not be saved.",
        },
      },
      "could not be submitted right now",
    ],
  ] as const;

  for (const [caseName, status, body, expectedMessage] of cases) {
    await openTestModeForm(page);
    await page.route("**/api/private-beta-applications", async (route) => {
      await route.fulfill(apiJsonResponse(body, status));
    });

    await fillValidForm(page);
    await completeTurnstile(page, `${caseName}.TOKEN`);
    await page
      .getByRole("button", { name: "Submit Private Beta application" })
      .click();

    await expect(page.locator("[data-error-summary]")).toBeFocused();
    await expect(page.locator("[data-error-summary]")).toContainText(
      expectedMessage,
    );
    await expect(page.locator('[name="fullName"]')).toHaveValue(
      validAnswers.fullName,
    );
    await expect(
      page.getByRole("button", { name: "Submit Private Beta application" }),
    ).toBeDisabled();

    const state = await getTurnstileState(page);
    expect(state?.resetCount).toBeGreaterThanOrEqual(1);

    await page.unroute("**/api/private-beta-applications");
  }
});

test("network failure preserves answers and resets verification", async ({
  page,
}) => {
  await openTestModeForm(page);
  await page.route("**/api/private-beta-applications", async (route: Route) => {
    await route.abort();
  });

  await fillValidForm(page);
  await completeTurnstile(page);
  await page
    .getByRole("button", { name: "Submit Private Beta application" })
    .click();

  await expect(page.locator("[data-error-summary]")).toBeFocused();
  await expect(page.locator("[data-error-summary]")).toContainText(
    "could not be submitted right now",
  );
  await expect(page.locator('[name="fullName"]')).toHaveValue(
    validAnswers.fullName,
  );
  await expect(
    page.getByRole("button", { name: "Submit Private Beta application" }),
  ).toBeDisabled();
});

for (const width of [390, 768, 1440] as const) {
  test(`private beta client form has no overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openTestModeForm(page);

    await expectNoHorizontalOverflow(page);
    await expect(page.locator("[data-turnstile-container]")).toBeVisible();
    await expect(page.locator('[name="processingConsent"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit Private Beta application" }),
    ).toBeVisible();
  });
}
