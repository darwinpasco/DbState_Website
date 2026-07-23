/// <reference path="./types.d.ts" />

import { env } from "cloudflare:workers";
import { describe, expect, test, vi } from "vitest";
import worker from "../../worker/index";
import {
  CONSENT_VERSION,
  SUCCESS_RESPONSE_STATUS,
} from "../../worker/private-beta/application-contract";
import type { WorkerEnv } from "../../worker/private-beta/application-handler";
import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
} from "../../worker/private-beta/application-repository";

const endpoint = "https://dbstate.com/api/private-beta-applications";

function validApplication(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "Test Evaluator",
    workEmail: "Evaluator@Example.Invalid",
    companyTeamOrProject: "Example database team",
    role: "Database engineer",
    postgresqlVersions: "PostgreSQL 16",
    windowsVersion: "Windows 11",
    otherDatabaseEngines: "None",
    gitWorkflow: "Pull requests with local feature branches",
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
    importantObjectTypes:
      "Tables, constraints, views, grants, and reference data",
    managesReferenceDataInGit: "partially",
    evaluationGoals:
      "Evaluate whether repository desired state makes review clearer.",
    processingConsent: true,
    ...overrides,
  };
}

function createAssetsBinding() {
  return {
    fetch: async () =>
      new Response("static asset", {
        headers: {
          "content-type": "text/plain",
          "x-test-asset-fetch": "1",
        },
      }),
  };
}

function createEnv(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    ASSETS: createAssetsBinding(),
    PRIVATE_BETA_DB: env.PRIVATE_BETA_DB,
    PRIVATE_BETA_INTAKE_MODE: "test",
    ...overrides,
  };
}

function jsonRequest(body: unknown, init: RequestInit = {}, url = endpoint) {
  return new Request(url, {
    ...init,
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });
}

async function fetchWorker(request: Request, testEnv = createEnv()) {
  return worker.fetch(request, testEnv);
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

async function applicationCount() {
  const row = await env.PRIVATE_BETA_DB.prepare(
    "SELECT COUNT(*) AS count FROM private_beta_applications",
  ).first<{ count: number }>();
  return Number(row?.count ?? 0);
}

async function historyCount() {
  const row = await env.PRIVATE_BETA_DB.prepare(
    "SELECT COUNT(*) AS count FROM private_beta_application_status_history",
  ).first<{ count: number }>();
  return Number(row?.count ?? 0);
}

describe("private beta application routing", () => {
  test("unknown API route returns JSON 404", async () => {
    const response = await fetchWorker(
      new Request("https://dbstate.com/api/unknown"),
    );
    const body = await readJson(response);

    expect(response.status).toBe(404);
    expect(body).toMatchObject({
      error: {
        code: "not_found",
      },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  test("GET and PUT return 405 with Allow POST", async () => {
    for (const method of ["GET", "PUT"]) {
      const response = await fetchWorker(new Request(endpoint, { method }));
      const body = await readJson(response);

      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("POST");
      expect(body).toMatchObject({
        error: {
          code: "method_not_allowed",
        },
      });
    }
  });

  test("non-API requests fall through to static assets", async () => {
    const response = await fetchWorker(new Request("https://dbstate.com/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-test-asset-fetch")).toBe("1");
    expect(await response.text()).toBe("static asset");
  });
});

describe("private beta disabled mode", () => {
  test("POST returns 503 without validation or D1 writes", async () => {
    const response = await fetchWorker(
      jsonRequest({ unexpected: "field" }),
      createEnv({ PRIVATE_BETA_INTAKE_MODE: "disabled" }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        code: "intake_disabled",
        message: "Private Beta application intake is not currently enabled.",
      },
    });
    expect(await applicationCount()).toBe(0);
    expect(await historyCount()).toBe(0);
  });
});

describe("private beta request format controls", () => {
  test("wrong content type returns 415", async () => {
    const response = await fetchWorker(
      new Request(endpoint, {
        method: "POST",
        body: "{}",
        headers: {
          "content-type": "text/plain",
        },
      }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(415);
    expect(body).toMatchObject({
      error: {
        code: "unsupported_media_type",
      },
    });
  });

  test("malformed JSON returns 400", async () => {
    const response = await fetchWorker(
      new Request(endpoint, {
        method: "POST",
        body: "{",
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      error: {
        code: "malformed_json",
      },
    });
  });

  test("oversized body returns 413", async () => {
    const response = await fetchWorker(
      jsonRequest(validApplication({ evaluationGoals: "x".repeat(33_000) })),
    );
    const body = await readJson(response);

    expect(response.status).toBe(413);
    expect(body).toMatchObject({
      error: {
        code: "payload_too_large",
      },
    });
  });

  test("cross-origin requests are rejected and same-origin requests continue", async () => {
    const crossOrigin = await fetchWorker(
      jsonRequest(validApplication(), {
        headers: {
          origin: "https://example.invalid",
        },
      }),
    );
    const sameOrigin = await fetchWorker(
      jsonRequest(
        {},
        {
          headers: {
            origin: "https://dbstate.com",
          },
        },
      ),
    );

    expect(crossOrigin.status).toBe(403);
    expect(await readJson(crossOrigin)).toMatchObject({
      error: {
        code: "origin_not_allowed",
      },
    });
    expect(sameOrigin.status).toBe(422);
  });
});

describe("private beta validation", () => {
  test("missing required fields return field-specific errors", async () => {
    const response = await fetchWorker(jsonRequest({}));
    const body = await readJson(response);

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      error: {
        code: "validation_failed",
      },
    });
    expect(
      (body.error as { fields: Record<string, string> }).fields.fullName,
    ).toBe("This field is required.");
  });

  test("unexpected fields, invalid enums, invalid email, and false consent fail", async () => {
    const response = await fetchWorker(
      jsonRequest(
        validApplication({
          workEmail: "not-an-email",
          firstWorkflow: "sync",
          managesReferenceDataInGit: "sometimes",
          processingConsent: false,
          arbitraryMetadata: "not accepted",
        }),
      ),
    );
    const body = await readJson(response);
    const fields = (body.error as { fields: Record<string, string> }).fields;

    expect(response.status).toBe(422);
    expect(fields.workEmail).toBe("Enter a valid work email address.");
    expect(fields.firstWorkflow).toBe("Select a supported value.");
    expect(fields.managesReferenceDataInGit).toBe("Select a supported value.");
    expect(fields.processingConsent).toBe("Processing consent is required.");
    expect(fields.arbitraryMetadata).toBe("Unexpected field.");
  });

  test("whitespace-only and excessive-length fields fail without echoing applicant content", async () => {
    const applicantContent = "Sensitive Applicant Content";
    const response = await fetchWorker(
      jsonRequest(
        validApplication({
          fullName: "   ",
          role: applicantContent.repeat(20),
        }),
      ),
    );
    const responseText = await response.text();

    expect(response.status).toBe(422);
    expect(responseText).not.toContain(applicantContent);
    expect(responseText).toContain("fullName");
    expect(responseText).toContain("role");
  });

  test("arrays, objects, and sensitive content are rejected", async () => {
    const response = await fetchWorker(
      jsonRequest(
        validApplication({
          companyTeamOrProject: ["database team"],
          difficultChange: "The password is not allowed in application text.",
          gitWorkflow: { host: "example" },
        }),
      ),
    );
    const body = await readJson(response);
    const fields = (body.error as { fields: Record<string, string> }).fields;

    expect(response.status).toBe(422);
    expect(fields.companyTeamOrProject).toBe("Expected a string value.");
    expect(fields.gitWorkflow).toBe("Expected a string value.");
    expect(fields.difficultChange).toBe(
      "Do not include credentials or sensitive content.",
    );
  });
});

describe("private beta persistence", () => {
  test("valid requests return public fields and persist application plus history", async () => {
    const response = await fetchWorker(
      jsonRequest(
        validApplication({
          fullName: "  Test Evaluator  ",
          workEmail: "  EVALUATOR@EXAMPLE.INVALID  ",
          futureUpdatesOptIn: undefined,
        }),
      ),
    );
    const body = await readJson(response);

    expect(response.status).toBe(201);
    expect(Object.keys(body).sort()).toEqual([
      "applicationReference",
      "status",
      "submittedAt",
    ]);
    expect(body.applicationReference).toMatch(/^DBS-PB-[0-9A-F]{12}$/);
    expect(body.status).toBe(SUCCESS_RESPONSE_STATUS);

    const application = await env.PRIVATE_BETA_DB.prepare(
      "SELECT * FROM private_beta_applications",
    ).first<Record<string, string | number>>();
    const history = await env.PRIVATE_BETA_DB.prepare(
      "SELECT * FROM private_beta_application_status_history",
    ).first<Record<string, string>>();

    expect(application?.full_name).toBe("Test Evaluator");
    expect(application?.work_email).toBe("evaluator@example.invalid");
    expect(application?.normalized_email).toBe("evaluator@example.invalid");
    expect(application?.status).toBe("new");
    expect(application?.processing_consent).toBe(1);
    expect(application?.future_updates_opt_in).toBe(0);
    expect(application?.consent_version).toBe(CONSENT_VERSION);
    expect(application?.source).toBe("website");
    expect(history?.application_id).toBe(application?.application_id);
    expect(history?.status).toBe("new");
    expect(history?.changed_by).toBe("system");
    expect(history?.note).toBe("Application received");

    const submittedAt = Date.parse(String(application?.submitted_at));
    const retentionUntil = Date.parse(String(application?.retention_until));
    const retentionDays = (retentionUntil - submittedAt) / 86_400_000;
    expect(retentionDays).toBe(365);
  });

  test("future updates opt-in persists when explicitly true", async () => {
    await fetchWorker(
      jsonRequest(
        validApplication({
          futureUpdatesOptIn: true,
        }),
      ),
    );

    const application = await env.PRIVATE_BETA_DB.prepare(
      "SELECT future_updates_opt_in FROM private_beta_applications",
    ).first<{ future_updates_opt_in: number }>();

    expect(application?.future_updates_opt_in).toBe(1);
  });
});

describe("private beta duplicate protection", () => {
  test("same normalized email in the same bucket returns 409 without extra rows", async () => {
    const first = await fetchWorker(jsonRequest(validApplication()));
    const second = await fetchWorker(
      jsonRequest(
        validApplication({
          workEmail: "EVALUATOR@example.invalid",
        }),
      ),
    );
    const third = await fetchWorker(
      jsonRequest(
        validApplication({
          workEmail: "other@example.invalid",
        }),
      ),
    );

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(await readJson(second)).toEqual({
      error: {
        code: "duplicate_application",
        message:
          "An application from this email address was already received recently.",
      },
    });
    expect(third.status).toBe(201);
    expect(await applicationCount()).toBe(2);
    expect(await historyCount()).toBe(2);
  });
});

describe("private beta failure behavior", () => {
  test("missing D1 binding returns intake_not_configured", async () => {
    const response = await fetchWorker(
      jsonRequest(validApplication()),
      createEnv({ PRIVATE_BETA_DB: undefined }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        code: "intake_not_configured",
        message: "Private Beta application intake is not configured.",
      },
    });
  });

  test("simulated D1 failure returns controlled error without raw details or logs", async () => {
    const statement: D1PreparedStatementLike = {
      bind: () => statement,
      first: async () => null,
      all: async () => ({ results: [] }),
      run: async () => ({}),
    };
    const failingDb: D1DatabaseLike = {
      prepare: () => statement,
      batch: async () => {
        throw new Error("raw sqlite failure for Sensitive Applicant Content");
      },
    };
    const logSpy = vi.spyOn(console, "log");
    const errorSpy = vi.spyOn(console, "error");

    const response = await fetchWorker(
      jsonRequest(validApplication()),
      createEnv({ PRIVATE_BETA_DB: failingDb }),
    );
    const responseText = await response.text();

    expect(response.status).toBe(500);
    expect(responseText).toContain("persistence_failed");
    expect(responseText).not.toContain("raw sqlite");
    expect(responseText).not.toContain("Sensitive Applicant Content");
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
