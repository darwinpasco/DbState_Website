# Private Beta Application Contract

This document describes the versioned backend contract for future DbState Private Beta application intake.

The public website form remains disabled in this slice. No browser submission is connected, no email is sent, and no Turnstile validation is included. Production and preview D1 database IDs are configured in `wrangler.jsonc`, but this contract slice does not apply remote migrations or enable public intake.

## Endpoint

```text
POST /api/private-beta-applications
```

Only this API path is configured to run Worker code before static assets. Normal website pages and assets remain asset-first.

## Public State

Production intake is disabled:

```text
PRIVATE_BETA_INTAKE_MODE=disabled
```

When disabled, a POST returns `503 Service Unavailable` without validating or persisting the request:

```json
{
  "error": {
    "code": "intake_disabled",
    "message": "Private Beta application intake is not currently enabled."
  }
}
```

Worker tests use `PRIVATE_BETA_INTAKE_MODE=test` with a locally simulated D1 binding.

The production and preview D1 databases use the single Worker binding `PRIVATE_BETA_DB`. See [Private Beta D1 Operations](./private-beta-d1-operations.md) for the configured IDs and migration commands.

## Request Body

Requests must use `Content-Type: application/json` and must not exceed 32 KiB.

The request body accepts exactly these fields:

```ts
{
  fullName: string;
  workEmail: string;
  companyTeamOrProject: string;
  role: string;

  postgresqlVersions: string;
  windowsVersion: string;
  otherDatabaseEngines?: string;
  gitWorkflow?: string;

  schemaChangeProcess: string;
  referenceDataProcess: string;
  databaseReviewers: string;
  releaseSqlProcess: string;

  difficultChange: string;

  firstWorkflow:
    | "schema-database-to-repository"
    | "schema-repository-to-database"
    | "reference-data-database-to-repository"
    | "reference-data-repository-to-database";

  importantObjectTypes: string;

  managesReferenceDataInGit: "yes" | "no" | "partially";

  evaluationGoals: string;

  processingConsent: true;
  futureUpdatesOptIn?: boolean;
}
```

Unexpected fields are rejected.

## Field Limits

| Field                  | Required | Length     |
| ---------------------- | -------- | ---------- |
| `fullName`             | yes      | 2 to 120   |
| `workEmail`            | yes      | 3 to 254   |
| `companyTeamOrProject` | yes      | 2 to 160   |
| `role`                 | yes      | 2 to 120   |
| `postgresqlVersions`   | yes      | 1 to 200   |
| `windowsVersion`       | yes      | 1 to 120   |
| `otherDatabaseEngines` | no       | 0 to 300   |
| `gitWorkflow`          | no       | 0 to 1000  |
| `schemaChangeProcess`  | yes      | 10 to 2000 |
| `referenceDataProcess` | yes      | 10 to 2000 |
| `databaseReviewers`    | yes      | 2 to 1000  |
| `releaseSqlProcess`    | yes      | 10 to 2000 |
| `difficultChange`      | yes      | 20 to 4000 |
| `importantObjectTypes` | yes      | 2 to 1000  |
| `evaluationGoals`      | yes      | 10 to 2000 |

String values are trimmed before validation and persistence. `workEmail` is normalized to lowercase. `futureUpdatesOptIn` defaults to `false`.

## Rejected Content

The contract does not accept passwords, connection strings, access tokens, private keys, SQL uploads, schema uploads, customer records, attachments, or arbitrary metadata.

Do not include credentials or production secrets in future application intake.

## Success Response

In test mode with a D1 binding, a valid request returns:

```http
201 Created
```

```json
{
  "applicationReference": "DBS-PB-XXXXXXXXXXXX",
  "status": "received",
  "submittedAt": "ISO-8601 timestamp"
}
```

The response does not return internal IDs, applicant email, D1 metadata, applicant answers, SQL details, or status-history IDs.

## Error Response

All API errors use this shape:

```ts
{
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
```

Supported error codes:

| Status | Code                     |
| ------ | ------------------------ |
| 400    | `malformed_json`         |
| 403    | `origin_not_allowed`     |
| 405    | `method_not_allowed`     |
| 409    | `duplicate_application`  |
| 413    | `payload_too_large`      |
| 415    | `unsupported_media_type` |
| 422    | `validation_failed`      |
| 500    | `persistence_failed`     |
| 503    | `intake_disabled`        |
| 503    | `intake_not_configured`  |

Errors never expose stack traces, D1 error text, SQL, internal paths, binding names, or applicant content.

## Duplicate Rule

Duplicate protection is enforced by D1 through a unique index on:

```text
normalized_email, submission_bucket
```

The submission bucket is the UTC 24-hour bucket for the submission timestamp. Multiple applications from the same normalized email address in the same bucket return:

```json
{
  "error": {
    "code": "duplicate_application",
    "message": "An application from this email address was already received recently."
  }
}
```

No IP tracking or browser fingerprinting is used.

## Persistence Metadata

The initial application status stored in D1 is:

```text
new
```

The public success response uses:

```text
received
```

The initial status-history row records:

```text
status = new
changed_by = system
note = Application received
```

Consent and retention metadata:

```text
consent_version = private-beta-application-v1
retention_until = submitted_at + 365 days
```

This slice records the retention date only. It does not add scheduled deletion.

## Stored Data Boundaries

The D1 schema does not store:

- IP address
- User agent
- Turnstile token
- Attachments
- Cookies
- Session identifiers

## Later Work Required Before Enabling Intake

Before public intake can be enabled, later reviewed slices must connect the disabled browser form, apply and verify remote D1 migrations, decide and implement abuse protection such as Turnstile, add notification email if approved, and update operational privacy documentation.

This slice does not deploy and does not enable public application submission.

## Preview migration evidence

Verified on 2026-07-23:

- Preview database ID: `5b3e215c-0ecb-40eb-a4c4-794f913c9cee`
- `0001_private_beta_applications.sql` applied successfully
- No preview migrations remain pending
- `private_beta_applications` exists
- `private_beta_application_status_history` exists
- Required indexes exist
- Application count is `0`
- Status-history count is `0`
- Production migration remains unapplied
- Public intake remains disabled
