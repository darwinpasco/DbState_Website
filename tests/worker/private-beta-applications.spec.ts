/// <reference path="./types.d.ts" />

import { env } from "cloudflare:workers";
import { describe, expect, test, vi } from "vitest";
import worker from "../../worker/index";
import {
  CONSENT_VERSION,
  SUCCESS_RESPONSE_STATUS,
  TURNSTILE_EXPECTED_ACTION,
} from "../../worker/private-beta/application-contract";
import type { WorkerEnv } from "../../worker/private-beta/application-handler";
import {
  RETENTION_CRON,
  RETENTION_RUN_LOG,
  type ScheduledControllerLike,
} from "../../worker/private-beta/application-retention";
import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
} from "../../worker/private-beta/application-repository";
import type { SendEmailBinding } from "../../worker/private-beta/application-notification";
import type { SiteverifyFetch } from "../../worker/private-beta/turnstile-validation";

const endpoint = "https://dbstate.com/api/private-beta-applications";
const fakeTurnstileToken = "fake-turnstile-token";
const fakeTurnstileSecret = "fake-turnstile-secret";

function siteverifySuccessBody(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    action: TURNSTILE_EXPECTED_ACTION,
    hostname: "dbstate.com",
    ...overrides,
  };
}

function createSiteverifyFetch(
  body: unknown = siteverifySuccessBody(),
  init: ResponseInit = {},
) {
  const siteverifyFetch: SiteverifyFetch = async () => {
    return new Response(JSON.stringify(body), {
      status: init.status ?? 200,
      headers: {
        "content-type": "application/json",
        ...init.headers,
      },
    });
  };

  return vi.fn(siteverifyFetch);
}

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
    turnstileToken: fakeTurnstileToken,
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

function createEmailBinding(
  implementation: SendEmailBinding["send"] = async () => ({
    messageId: "test-message",
  }),
) {
  return {
    send: vi.fn(implementation),
  };
}

function createEnv(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    ASSETS: createAssetsBinding(),
    PRIVATE_BETA_DB: env.PRIVATE_BETA_DB,
    PRIVATE_BETA_EMAIL: createEmailBinding(),
    PRIVATE_BETA_NOTIFICATION_TO: "darwin@dbstate.com",
    PRIVATE_BETA_EMAIL_FROM: "private-beta@dbstate.com",
    PRIVATE_BETA_EMAIL_REPLY_TO: "darwin@dbstate.com",
    PRIVATE_BETA_INTAKE_MODE: "test",
    PRIVATE_BETA_RETENTION_ENFORCEMENT_MODE: "test",
    PRIVATE_BETA_RETENTION_BATCH_SIZE: "100",
    TURNSTILE_EXPECTED_ACTION,
    TURNSTILE_EXPECTED_HOSTNAMES: "dbstate.com,www.dbstate.com",
    TURNSTILE_SECRET_KEY: fakeTurnstileSecret,
    TURNSTILE_SITE_KEY: "not-used-by-server-validation",
    TURNSTILE_SITEVERIFY_FETCH: createSiteverifyFetch(),
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

async function fetchWorkerWithWaitUntil(
  request: Request,
  testEnv = createEnv(),
) {
  const waitUntilPromises: Promise<unknown>[] = [];
  const response = await worker.fetch(request, testEnv, {
    waitUntil: (promise: Promise<unknown>) => {
      waitUntilPromises.push(promise);
    },
  });

  return {
    response,
    waitUntilPromises,
  };
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

async function applicationIds() {
  const rows = await env.PRIVATE_BETA_DB.prepare(
    "SELECT application_id FROM private_beta_applications ORDER BY retention_until ASC, application_id ASC",
  ).all<{ application_id: string }>();
  return rows.results.map((row) => row.application_id);
}

async function insertSyntheticApplication(options: {
  applicationId?: string;
  applicationReference?: string;
  normalizedEmail?: string;
  retentionUntil: string;
  status?: string;
  submittedAt?: string;
  historyRows?: number;
}) {
  const applicationId = options.applicationId ?? crypto.randomUUID();
  const submittedAt = options.submittedAt ?? "2025-01-01T00:00:00.000Z";
  const normalizedEmail =
    options.normalizedEmail ??
    `${applicationId.replaceAll("-", "")}@example.invalid`;
  const applicationReference =
    options.applicationReference ??
    `DBS-PB-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const status = options.status ?? "new";
  const historyRows = options.historyRows ?? 1;

  await env.PRIVATE_BETA_DB.prepare(
    `INSERT INTO private_beta_applications (
      application_id,
      application_reference,
      full_name,
      work_email,
      normalized_email,
      company_team_project,
      role,
      postgresql_versions,
      windows_version,
      schema_change_process,
      reference_data_process,
      database_reviewers,
      release_sql_process,
      difficult_change,
      first_workflow,
      important_object_types,
      manages_reference_data_in_git,
      evaluation_goals,
      processing_consent,
      future_updates_opt_in,
      consent_version,
      status,
      submission_bucket,
      source,
      submitted_at,
      updated_at,
      retention_until
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      applicationId,
      applicationReference,
      "Retention Test Applicant",
      normalizedEmail,
      normalizedEmail,
      "Retention test project",
      "Database engineer",
      "PostgreSQL 16",
      "Windows 11",
      "Synthetic schema-change process for retention tests.",
      "Synthetic reference-data process for retention tests.",
      "Synthetic reviewers",
      "Synthetic release SQL process for retention tests.",
      "Synthetic difficult change narrative for retention tests.",
      "schema-repository-to-database",
      "Tables and reference data",
      "partially",
      "Synthetic retention evaluation goals.",
      1,
      0,
      CONSENT_VERSION,
      status,
      20_100,
      "website",
      submittedAt,
      submittedAt,
      options.retentionUntil,
    )
    .run();

  for (let index = 0; index < historyRows; index += 1) {
    await env.PRIVATE_BETA_DB.prepare(
      `INSERT INTO private_beta_application_status_history (
        status_history_id,
        application_id,
        status,
        changed_at,
        changed_by,
        note
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        applicationId,
        status,
        submittedAt,
        "system",
        "Synthetic status history",
      )
      .run();
  }

  return applicationId;
}

async function runScheduled(
  testEnv = createEnv(),
  overrides: Partial<ScheduledControllerLike> = {},
) {
  const controller: ScheduledControllerLike = {
    cron: RETENTION_CRON,
    scheduledTime: Date.parse("2026-07-24T03:17:00.000Z"),
    ...overrides,
  };

  await worker.scheduled(controller, testEnv, {
    waitUntil: (promise: Promise<unknown>) => {
      void promise;
    },
  });
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
    const siteverifyFetch = createSiteverifyFetch();
    const emailBinding = createEmailBinding();
    const response = await fetchWorker(
      jsonRequest({ unexpected: "field" }),
      createEnv({
        PRIVATE_BETA_INTAKE_MODE: "disabled",
        PRIVATE_BETA_EMAIL: emailBinding,
        TURNSTILE_SITEVERIFY_FETCH: siteverifyFetch,
      }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        code: "intake_disabled",
        message: "Private Beta application intake is not currently enabled.",
      },
    });
    expect(siteverifyFetch).not.toHaveBeenCalled();
    expect(emailBinding.send).not.toHaveBeenCalled();
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

describe("private beta Turnstile configuration", () => {
  test("missing secret returns turnstile_not_configured without D1 writes", async () => {
    const siteverifyFetch = createSiteverifyFetch();
    const response = await fetchWorker(
      jsonRequest(validApplication()),
      createEnv({
        TURNSTILE_SECRET_KEY: undefined,
        TURNSTILE_SITEVERIFY_FETCH: siteverifyFetch,
      }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        code: "turnstile_not_configured",
        message: "Application verification is not currently configured.",
      },
    });
    expect(siteverifyFetch).not.toHaveBeenCalled();
    expect(await applicationCount()).toBe(0);
    expect(await historyCount()).toBe(0);
  });

  test("missing expected action returns controlled configuration error", async () => {
    const siteverifyFetch = createSiteverifyFetch();
    const response = await fetchWorker(
      jsonRequest(validApplication()),
      createEnv({
        TURNSTILE_EXPECTED_ACTION: undefined,
        TURNSTILE_SITEVERIFY_FETCH: siteverifyFetch,
      }),
    );

    expect(response.status).toBe(503);
    expect(await readJson(response)).toMatchObject({
      error: {
        code: "turnstile_not_configured",
      },
    });
    expect(siteverifyFetch).not.toHaveBeenCalled();
    expect(await applicationCount()).toBe(0);
  });

  test("missing expected hostname list returns controlled configuration error", async () => {
    const siteverifyFetch = createSiteverifyFetch();
    const response = await fetchWorker(
      jsonRequest(validApplication()),
      createEnv({
        TURNSTILE_EXPECTED_HOSTNAMES: undefined,
        TURNSTILE_SITEVERIFY_FETCH: siteverifyFetch,
      }),
    );

    expect(response.status).toBe(503);
    expect(await readJson(response)).toMatchObject({
      error: {
        code: "turnstile_not_configured",
      },
    });
    expect(siteverifyFetch).not.toHaveBeenCalled();
    expect(await applicationCount()).toBe(0);
  });

  test("public sitekey is not required by the server validation path", async () => {
    const response = await fetchWorker(
      jsonRequest(validApplication()),
      createEnv({
        TURNSTILE_SITE_KEY: undefined,
      }),
    );

    expect(response.status).toBe(201);
    expect(await applicationCount()).toBe(1);
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

  test("missing Turnstile token returns turnstile_required without field diagnostics", async () => {
    const siteverifyFetch = createSiteverifyFetch();
    const { turnstileToken: _turnstileToken, ...application } =
      validApplication();

    const response = await fetchWorker(
      jsonRequest(application),
      createEnv({ TURNSTILE_SITEVERIFY_FETCH: siteverifyFetch }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(422);
    expect(body).toEqual({
      error: {
        code: "turnstile_required",
        message: "Complete the verification before submitting the application.",
      },
    });
    expect(siteverifyFetch).not.toHaveBeenCalled();
    expect(await applicationCount()).toBe(0);
  });

  test("invalid Turnstile token values are rejected without echoing the token", async () => {
    for (const turnstileToken of [123, "   ", "x".repeat(2049)]) {
      const siteverifyFetch = createSiteverifyFetch();
      const response = await fetchWorker(
        jsonRequest(validApplication({ turnstileToken })),
        createEnv({ TURNSTILE_SITEVERIFY_FETCH: siteverifyFetch }),
      );
      const responseText = await response.text();

      expect(response.status).toBe(422);
      expect(responseText).not.toContain(String(turnstileToken));
      expect(responseText).not.toContain("fields");
      expect(siteverifyFetch).not.toHaveBeenCalled();
      expect(await applicationCount()).toBe(0);
    }
  });

  test("unexpected fields remain rejected and token content is not echoed", async () => {
    const response = await fetchWorker(
      jsonRequest(
        validApplication({
          arbitraryMetadata: "not accepted",
          turnstileToken: "sensitive-token-value",
        }),
      ),
    );
    const responseText = await response.text();

    expect(response.status).toBe(422);
    expect(responseText).toContain("arbitraryMetadata");
    expect(responseText).not.toContain("sensitive-token-value");
  });
});

describe("private beta persistence", () => {
  test("valid requests return public fields and persist application plus history", async () => {
    const siteverifyFetch = createSiteverifyFetch();
    const response = await fetchWorker(
      jsonRequest(
        validApplication({
          fullName: "  Test Evaluator  ",
          workEmail: "  EVALUATOR@EXAMPLE.INVALID  ",
          futureUpdatesOptIn: undefined,
        }),
      ),
      createEnv({ TURNSTILE_SITEVERIFY_FETCH: siteverifyFetch }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(201);
    expect(siteverifyFetch).toHaveBeenCalledOnce();
    const firstCall = siteverifyFetch.mock.calls[0]!;
    const siteverifyRequest = firstCall[0] as Request;
    expect(siteverifyRequest).toBeInstanceOf(Request);
    expect(siteverifyRequest.url).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    const siteverifyPayload = (await siteverifyRequest.json()) as Record<
      string,
      unknown
    >;
    expect(siteverifyPayload).toEqual({
      secret: fakeTurnstileSecret,
      response: fakeTurnstileToken,
      idempotency_key: expect.any(String),
    });
    expect(siteverifyPayload).not.toHaveProperty("remoteip");
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
    expect(JSON.stringify(application)).not.toContain(fakeTurnstileToken);
    expect(JSON.stringify(history)).not.toContain(fakeTurnstileToken);

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

describe("private beta notification email", () => {
  test("validation failure does not send email", async () => {
    const emailBinding = createEmailBinding();
    const response = await fetchWorker(
      jsonRequest({}),
      createEnv({ PRIVATE_BETA_EMAIL: emailBinding }),
    );

    expect(response.status).toBe(422);
    expect(emailBinding.send).not.toHaveBeenCalled();
    expect(await applicationCount()).toBe(0);
    expect(await historyCount()).toBe(0);
  });

  test("Turnstile failure does not send email", async () => {
    const emailBinding = createEmailBinding();
    const response = await fetchWorker(
      jsonRequest(validApplication()),
      createEnv({
        PRIVATE_BETA_EMAIL: emailBinding,
        TURNSTILE_SITEVERIFY_FETCH: createSiteverifyFetch({ success: false }),
      }),
    );

    expect(response.status).toBe(422);
    expect(emailBinding.send).not.toHaveBeenCalled();
    expect(await applicationCount()).toBe(0);
    expect(await historyCount()).toBe(0);
  });

  test("D1 persistence failure does not send email", async () => {
    const emailBinding = createEmailBinding();
    const statement: D1PreparedStatementLike = {
      bind: () => statement,
      first: async () => null,
      all: async () => ({ results: [] }),
      run: async () => ({}),
    };
    const failingDb: D1DatabaseLike = {
      prepare: () => statement,
      batch: async () => {
        throw new Error("raw sqlite failure");
      },
    };

    const response = await fetchWorker(
      jsonRequest(validApplication()),
      createEnv({
        PRIVATE_BETA_DB: failingDb,
        PRIVATE_BETA_EMAIL: emailBinding,
      }),
    );

    expect(response.status).toBe(500);
    expect(emailBinding.send).not.toHaveBeenCalled();
  });

  test("successful persistence schedules exactly one minimal internal email", async () => {
    const emailBinding = createEmailBinding();
    const { response, waitUntilPromises } = await fetchWorkerWithWaitUntil(
      jsonRequest(validApplication()),
      createEnv({ PRIVATE_BETA_EMAIL: emailBinding }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(201);
    expect(waitUntilPromises).toHaveLength(1);
    await Promise.all(waitUntilPromises);
    expect(emailBinding.send).toHaveBeenCalledOnce();

    const message = emailBinding.send.mock.calls[0]![0];
    expect(message.to).toBe("darwin@dbstate.com");
    expect(message.from).toEqual({
      email: "private-beta@dbstate.com",
      name: "DbState Private Beta",
    });
    expect(message.replyTo).toBe("darwin@dbstate.com");
    expect(message.subject).toBe(
      `[DbState Private Beta] New application ${body.applicationReference}`,
    );
    expect(message.text).toContain(String(body.applicationReference));
    expect(message.text).toContain("Test Evaluator");
    expect(message.text).toContain("evaluator@example.invalid");
    expect(message.text).toContain("Example database team");
    expect(message.text).toContain("Database engineer");
    expect(message.text).toContain("schema-repository-to-database");
    expect(message.text).toContain("PostgreSQL 16");
    expect(message.text).toContain(String(body.submittedAt));
    expect(message.text).toContain(
      "The complete application remains in the DbState Private Beta D1 record.",
    );

    for (const forbidden of [
      validApplication().difficultChange,
      validApplication().schemaChangeProcess,
      validApplication().referenceDataProcess,
      validApplication().releaseSqlProcess,
      validApplication().evaluationGoals,
      validApplication().gitWorkflow,
      fakeTurnstileToken,
      fakeTurnstileSecret,
      JSON.stringify(validApplication()),
    ]) {
      expect(message.text).not.toContain(forbidden);
      expect(message.html).not.toContain(forbidden);
    }
  });

  test("email failure keeps public 201 response and persisted records", async () => {
    const emailBinding = createEmailBinding(async () => {
      const error = new Error("raw delivery error with applicant details");
      (error as Error & { code: string }).code = "E_DELIVERY_FAILED";
      throw error;
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { response, waitUntilPromises } = await fetchWorkerWithWaitUntil(
      jsonRequest(validApplication()),
      createEnv({ PRIVATE_BETA_EMAIL: emailBinding }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(201);
    expect(Object.keys(body).sort()).toEqual([
      "applicationReference",
      "status",
      "submittedAt",
    ]);
    await Promise.all(waitUntilPromises);
    expect(await applicationCount()).toBe(1);
    expect(await historyCount()).toBe(1);
    expect(errorSpy).toHaveBeenCalledOnce();

    const logLine = String(errorSpy.mock.calls[0]![0]);
    expect(logLine).toContain(String(body.applicationReference));
    expect(logLine).toContain("E_DELIVERY_FAILED");
    expect(logLine).not.toContain("evaluator@example.invalid");
    expect(logLine).not.toContain("Test Evaluator");
    expect(logLine).not.toContain(validApplication().difficultChange);
    expect(logLine).not.toContain(fakeTurnstileToken);
    expect(logLine).not.toContain(fakeTurnstileSecret);
    expect(logLine).not.toContain("raw delivery error");

    errorSpy.mockRestore();
  });

  test("duplicate application response does not send another notification", async () => {
    const emailBinding = createEmailBinding();
    const first = await fetchWorker(
      jsonRequest(validApplication()),
      createEnv({ PRIVATE_BETA_EMAIL: emailBinding }),
    );
    const second = await fetchWorker(
      jsonRequest(validApplication({ workEmail: "evaluator@example.invalid" })),
      createEnv({ PRIVATE_BETA_EMAIL: emailBinding }),
    );

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(emailBinding.send).toHaveBeenCalledOnce();
    expect(await applicationCount()).toBe(1);
    expect(await historyCount()).toBe(1);
  });
});

describe("private beta scheduled retention", () => {
  test("disabled mode logs a safe no-op without D1 queries or email", async () => {
    const emailBinding = createEmailBinding();
    const db: D1DatabaseLike = {
      prepare: vi.fn(() => {
        throw new Error("D1 should not be queried");
      }),
      batch: vi.fn(async () => []),
    };
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    await runScheduled(
      createEnv({
        PRIVATE_BETA_DB: db,
        PRIVATE_BETA_EMAIL: emailBinding,
        PRIVATE_BETA_RETENTION_ENFORCEMENT_MODE: "disabled",
      }),
    );

    expect(db.prepare).not.toHaveBeenCalled();
    expect(db.batch).not.toHaveBeenCalled();
    expect(emailBinding.send).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      RETENTION_RUN_LOG,
      expect.objectContaining({
        classification: "disabled",
        scheduledAt: "2026-07-24T03:17:00.000Z",
      }),
    );
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain(
      "Retention Test Applicant",
    );

    infoSpy.mockRestore();
  });

  test("unexpected cron logs safely without D1 queries or deletion", async () => {
    const db: D1DatabaseLike = {
      prepare: vi.fn(() => {
        throw new Error("D1 should not be queried");
      }),
      batch: vi.fn(async () => []),
    };
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    await runScheduled(
      createEnv({
        PRIVATE_BETA_DB: db,
        PRIVATE_BETA_RETENTION_ENFORCEMENT_MODE: "test",
      }),
      { cron: "0 * * * *" },
    );

    expect(db.prepare).not.toHaveBeenCalled();
    expect(db.batch).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      RETENTION_RUN_LOG,
      expect.objectContaining({
        classification: "unexpected_cron",
        scheduledAt: "2026-07-24T03:17:00.000Z",
      }),
    );

    infoSpy.mockRestore();
  });

  test.each([
    ["missing mode", { PRIVATE_BETA_RETENTION_ENFORCEMENT_MODE: undefined }],
    ["invalid mode", { PRIVATE_BETA_RETENTION_ENFORCEMENT_MODE: "active" }],
    ["missing batch", { PRIVATE_BETA_RETENTION_BATCH_SIZE: undefined }],
    ["nonnumeric batch", { PRIVATE_BETA_RETENTION_BATCH_SIZE: "many" }],
    ["zero batch", { PRIVATE_BETA_RETENTION_BATCH_SIZE: "0" }],
    ["negative batch", { PRIVATE_BETA_RETENTION_BATCH_SIZE: "-1" }],
    ["decimal batch", { PRIVATE_BETA_RETENTION_BATCH_SIZE: "1.5" }],
    ["large batch", { PRIVATE_BETA_RETENTION_BATCH_SIZE: "501" }],
  ])(
    "%s fails safely without applicant content",
    async (_caseName, envPatch) => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(
        runScheduled(
          createEnv({
            PRIVATE_BETA_RETENTION_ENFORCEMENT_MODE: "test",
            PRIVATE_BETA_RETENTION_BATCH_SIZE: "100",
            ...envPatch,
          }),
        ),
      ).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledWith(
        RETENTION_RUN_LOG,
        expect.objectContaining({
          classification: "configuration_failed",
        }),
      );
      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
        "Retention Test Applicant",
      );

      errorSpy.mockRestore();
    },
  );

  test("no due candidates completes with zero counts and no email", async () => {
    const emailBinding = createEmailBinding();
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    await insertSyntheticApplication({
      retentionUntil: "2026-07-24T03:17:00.001Z",
    });
    await runScheduled(createEnv({ PRIVATE_BETA_EMAIL: emailBinding }));

    expect(await applicationCount()).toBe(1);
    expect(await historyCount()).toBe(1);
    expect(emailBinding.send).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      RETENTION_RUN_LOG,
      expect.objectContaining({
        classification: "completed",
        candidateCount: 0,
        deletedApplicationCount: 0,
        deletedHistoryCount: 0,
        moreDueRecords: false,
      }),
    );

    infoSpy.mockRestore();
  });

  test("due records are deleted by scheduled cutoff and future records remain", async () => {
    const statuses = [
      "new",
      "reviewing",
      "contacted",
      "accepted",
      "waitlisted",
      "declined",
      "withdrawn",
    ];
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    for (const status of statuses) {
      await insertSyntheticApplication({
        applicationId: `00000000-0000-4000-8000-${status.padEnd(12, "0").slice(0, 12)}`,
        retentionUntil: "2026-07-24T03:17:00.000Z",
        status,
        historyRows: 2,
      });
    }
    const futureId = await insertSyntheticApplication({
      applicationId: "00000000-0000-4000-8000-999999999999",
      retentionUntil: "2026-07-24T03:17:00.001Z",
    });

    await runScheduled(createEnv());

    expect(await applicationCount()).toBe(1);
    expect(await historyCount()).toBe(1);
    expect(await applicationIds()).toEqual([futureId]);
    expect(infoSpy).toHaveBeenCalledWith(
      RETENTION_RUN_LOG,
      expect.objectContaining({
        classification: "completed",
        candidateCount: 7,
        deletedApplicationCount: 7,
        deletedHistoryCount: 14,
        moreDueRecords: false,
      }),
    );

    infoSpy.mockRestore();
  });

  test("scheduled cutoff comes from controller scheduledTime, not machine time", async () => {
    await insertSyntheticApplication({
      retentionUntil: "2026-07-25T00:00:00.000Z",
    });

    await runScheduled(createEnv(), {
      scheduledTime: Date.parse("2026-07-24T03:17:00.000Z"),
    });

    expect(await applicationCount()).toBe(1);

    await runScheduled(createEnv(), {
      scheduledTime: Date.parse("2026-07-25T03:17:00.000Z"),
    });

    expect(await applicationCount()).toBe(0);
  });

  test("batch size bounds selection and leaves remaining records for next run", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const ids = [
      await insertSyntheticApplication({
        applicationId: "00000000-0000-4000-8000-000000000001",
        retentionUntil: "2026-07-20T00:00:00.000Z",
      }),
      await insertSyntheticApplication({
        applicationId: "00000000-0000-4000-8000-000000000002",
        retentionUntil: "2026-07-21T00:00:00.000Z",
      }),
      await insertSyntheticApplication({
        applicationId: "00000000-0000-4000-8000-000000000003",
        retentionUntil: "2026-07-22T00:00:00.000Z",
      }),
    ];

    await runScheduled(createEnv({ PRIVATE_BETA_RETENTION_BATCH_SIZE: "2" }));

    expect(await applicationIds()).toEqual([ids[2]]);
    expect(infoSpy).toHaveBeenCalledWith(
      RETENTION_RUN_LOG,
      expect.objectContaining({
        candidateCount: 2,
        deletedApplicationCount: 2,
        moreDueRecords: true,
      }),
    );

    infoSpy.mockRestore();
  });

  test("retention extension before deletion batch prevents parent and history deletion", async () => {
    type RetentionRecord = {
      applicationId: string;
      retentionUntil: string;
      historyCount: number;
    };
    class FakeStatement implements D1PreparedStatementLike {
      values: (string | number | null)[] = [];

      constructor(
        readonly query: string,
        private readonly records: RetentionRecord[],
      ) {}

      bind(...values: (string | number | null)[]) {
        this.values = values;
        return this;
      }

      async first<T>() {
        return { count: this.records.length } as T;
      }

      async all<T>() {
        return {
          results: this.records.map((record) => ({
            application_id: record.applicationId,
          })) as T[],
        };
      }

      async run() {
        return {};
      }
    }
    const record = {
      applicationId: "due-record",
      retentionUntil: "2026-07-01T00:00:00.000Z",
      historyCount: 1,
    };
    const records = [record];
    const db: D1DatabaseLike = {
      prepare: (query) => new FakeStatement(query, records),
      batch: async (statements) => {
        record.retentionUntil = "2026-08-01T00:00:00.000Z";

        return statements.map((statement) => {
          const fake = statement as FakeStatement;
          const applicationId = String(fake.values[0]);
          const cutoff = String(fake.values[1]);
          const matched = records.find(
            (item) =>
              item.applicationId === applicationId &&
              item.retentionUntil <= cutoff,
          );

          if (!matched) {
            return { meta: { changes: 0 } };
          }

          if (fake.query.includes("status_history")) {
            const changes = matched.historyCount;
            matched.historyCount = 0;
            return { meta: { changes } };
          }

          records.splice(records.indexOf(matched), 1);
          return { meta: { changes: 1 } };
        });
      },
    };

    await runScheduled(createEnv({ PRIVATE_BETA_DB: db }));

    expect(records).toEqual([
      {
        applicationId: "due-record",
        retentionUntil: "2026-08-01T00:00:00.000Z",
        historyCount: 1,
      },
    ]);
  });

  test("batch failure logs safely and leaves records for retry", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await insertSyntheticApplication({
      applicationReference: "DBS-PB-SECRETREF1",
      normalizedEmail: "secret-applicant@example.invalid",
      retentionUntil: "2026-07-01T00:00:00.000Z",
    });
    const realDb = env.PRIVATE_BETA_DB;
    const failingDb: D1DatabaseLike = {
      prepare: (query) => realDb.prepare(query),
      batch: async () => {
        throw new Error("raw D1 failure with secret-applicant@example.invalid");
      },
    };

    await expect(
      runScheduled(createEnv({ PRIVATE_BETA_DB: failingDb })),
    ).rejects.toThrow();

    expect(await applicationCount()).toBe(1);
    expect(await historyCount()).toBe(1);
    const logText = JSON.stringify(errorSpy.mock.calls);
    expect(logText).toContain("failed");
    expect(logText).not.toContain("secret-applicant@example.invalid");
    expect(logText).not.toContain("DBS-PB-SECRETREF1");
    expect(logText).not.toContain("raw D1 failure");

    errorSpy.mockRestore();
  });

  test("retention logs contain only approved counts and classifications", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const applicationId = await insertSyntheticApplication({
      applicationReference: "DBS-PB-PRIVACY01",
      normalizedEmail: "privacy-log@example.invalid",
      retentionUntil: "2026-07-01T00:00:00.000Z",
    });

    await runScheduled(createEnv());

    const logText = JSON.stringify(infoSpy.mock.calls);
    expect(logText).toContain("completed");
    expect(logText).toContain("candidateCount");
    expect(logText).toContain("deletedApplicationCount");
    expect(logText).not.toContain("Retention Test Applicant");
    expect(logText).not.toContain("privacy-log@example.invalid");
    expect(logText).not.toContain("DBS-PB-PRIVACY01");
    expect(logText).not.toContain(applicationId);
    expect(logText).not.toContain("Synthetic difficult change narrative");
    expect(logText).not.toContain(fakeTurnstileToken);

    infoSpy.mockRestore();
  });

  test("retention never sends a new-application notification", async () => {
    const emailBinding = createEmailBinding();
    await insertSyntheticApplication({
      retentionUntil: "2026-07-01T00:00:00.000Z",
    });

    await runScheduled(createEnv({ PRIVATE_BETA_EMAIL: emailBinding }));

    expect(emailBinding.send).not.toHaveBeenCalled();
  });
});

describe("private beta Turnstile rejection behavior", () => {
  test.each([
    ["unsuccessful token", { success: false }, 422, "turnstile_invalid"],
    [
      "expired or duplicate token",
      { success: false, "error-codes": ["timeout-or-duplicate"] },
      422,
      "turnstile_invalid",
    ],
    ["malformed response", { success: "yes" }, 422, "turnstile_invalid"],
    [
      "action mismatch",
      siteverifySuccessBody({ action: "other-action" }),
      422,
      "turnstile_action_mismatch",
    ],
    [
      "missing action",
      { success: true, hostname: "dbstate.com" },
      422,
      "turnstile_action_mismatch",
    ],
    [
      "hostname mismatch",
      siteverifySuccessBody({ hostname: "example.invalid" }),
      422,
      "turnstile_hostname_mismatch",
    ],
    [
      "missing hostname",
      { success: true, action: TURNSTILE_EXPECTED_ACTION },
      422,
      "turnstile_hostname_mismatch",
    ],
    [
      "non-2xx response",
      siteverifySuccessBody(),
      503,
      "turnstile_unavailable",
      502,
    ],
  ])(
    "%s rejects without persisting",
    async (_caseName, siteverifyBody, status, code, siteverifyStatus = 200) => {
      const response = await fetchWorker(
        jsonRequest(validApplication()),
        createEnv({
          TURNSTILE_SITEVERIFY_FETCH: createSiteverifyFetch(siteverifyBody, {
            status: siteverifyStatus,
          }),
        }),
      );
      const body = await readJson(response);

      expect(response.status).toBe(status);
      expect(body).toMatchObject({
        error: {
          code,
        },
      });
      expect(JSON.stringify(body)).not.toContain(fakeTurnstileToken);
      expect(await applicationCount()).toBe(0);
      expect(await historyCount()).toBe(0);
    },
  );

  test("network error rejects without persisting", async () => {
    const response = await fetchWorker(
      jsonRequest(validApplication()),
      createEnv({
        TURNSTILE_SITEVERIFY_FETCH: vi.fn(async () => {
          throw new Error("network failure with secret data");
        }),
      }),
    );
    const responseText = await response.text();

    expect(response.status).toBe(503);
    expect(responseText).toContain("turnstile_unavailable");
    expect(responseText).not.toContain("network failure");
    expect(responseText).not.toContain(fakeTurnstileToken);
    expect(await applicationCount()).toBe(0);
    expect(await historyCount()).toBe(0);
  });

  test("request timeout rejects without persisting", async () => {
    const response = await fetchWorker(
      jsonRequest(validApplication()),
      createEnv({
        TURNSTILE_SITEVERIFY_TIMEOUT_MS: "1",
        TURNSTILE_SITEVERIFY_FETCH: vi.fn(
          (_request: RequestInfo | URL, init?: RequestInit) =>
            new Promise<Response>((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () => {
                reject(new DOMException("Aborted", "AbortError"));
              });
            }),
        ),
      }),
    );

    expect(response.status).toBe(503);
    expect(await readJson(response)).toMatchObject({
      error: {
        code: "turnstile_unavailable",
      },
    });
    expect(await applicationCount()).toBe(0);
    expect(await historyCount()).toBe(0);
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

  test("Turnstile validation does not log tokens, secrets, applicant content, or raw responses", async () => {
    const logSpy = vi.spyOn(console, "log");
    const errorSpy = vi.spyOn(console, "error");

    const response = await fetchWorker(
      jsonRequest(
        validApplication({
          difficultChange:
            "A difficult schema review with private applicant details.",
        }),
      ),
      createEnv({
        TURNSTILE_SITEVERIFY_FETCH: createSiteverifyFetch(
          {
            success: false,
            "error-codes": ["invalid-input-response"],
            raw: "raw provider response",
          },
          { status: 200 },
        ),
      }),
    );
    const responseText = await response.text();

    expect(response.status).toBe(422);
    expect(responseText).not.toContain(fakeTurnstileToken);
    expect(responseText).not.toContain(fakeTurnstileSecret);
    expect(responseText).not.toContain("private applicant details");
    expect(responseText).not.toContain("raw provider response");
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
