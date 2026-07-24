# Private Beta Application Contract

This document describes the versioned backend contract for future DbState Private Beta application intake.

The public website form remains closed by default. Browser submission is wired only for focused test-mode builds and future enabled builds. After a future valid application is durably persisted, the Worker schedules one minimal internal notification email. The Worker API requires server-side Cloudflare Turnstile validation before persistence when intake is in `test` or future `enabled` mode. Production and preview D1 database IDs are configured in `wrangler.jsonc`, and the initial migration has been verified separately. Public intake is still disabled.

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

Worker tests use `PRIVATE_BETA_INTAKE_MODE=test` with a locally simulated D1 binding and deterministic mocked Turnstile Siteverify responses.

The production and preview D1 databases use the single Worker binding `PRIVATE_BETA_DB`. See [Private Beta D1 Operations](./private-beta-d1-operations.md) for the configured IDs and migration commands.

Turnstile operations are documented in [Private Beta Turnstile Operations](./private-beta-turnstile-operations.md). The browser widget is loaded only in public `test` mode or a future public `enabled` mode.

Applicant privacy handling is disclosed on the public `/privacy/` page and operationally documented in [Private Beta Privacy Operations](./private-beta-privacy-operations.md).

## Public Browser Mode

The static Private Beta page has a separate build-time mode:

```text
PUBLIC_PRIVATE_BETA_INTAKE_MODE
```

Allowed values:

- `disabled`
- `test`
- `enabled`

Missing or invalid values default to `disabled`.

In `disabled` mode, the page presents the questionnaire as a preview. The submit button remains disabled, no Turnstile script is loaded, no API submission handler is installed, and no information entered on the page is transmitted to or stored by DbState while application intake is closed.

In `test` mode, focused Playwright tests use Cloudflare's always-pass public sitekey:

```text
1x00000000000000000000AA
```

The tests mock browser API responses and do not contact remote D1.

In a future `enabled` mode, the page requires `PUBLIC_TURNSTILE_SITE_KEY`, renders Turnstile explicitly, waits for a verification token, and submits JSON to the same-origin API. The committed production build does not use this mode.

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

  turnstileToken: string;
}
```

Unexpected fields are rejected.

The browser form uses matching `name` attributes for application fields, processing consent, optional future-updates consent, and workflow enum selections. It submits JSON through `fetch` and does not use native form submission, a form `action`, or a form `method`.

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
| `turnstileToken`       | yes      | 1 to 2048  |

String values are trimmed before validation and persistence. `workEmail` is normalized to lowercase. `futureUpdatesOptIn` defaults to `false`. `turnstileToken` is trimmed and validated server-side, but it is never persisted.

## Rejected Content

The contract does not accept passwords, connection strings, access tokens, private keys, SQL uploads, schema uploads, customer records, attachments, or arbitrary metadata.

Do not include credentials or production secrets in future application intake.

## Turnstile Validation

When intake is in `test` or future `enabled` mode, the Worker validates every accepted request token through Cloudflare Turnstile Siteverify before D1 persistence:

```text
POST https://challenges.cloudflare.com/turnstile/v0/siteverify
```

The Siteverify request sends:

- `secret` from the Worker secret `TURNSTILE_SECRET_KEY`
- `response` from `turnstileToken`
- `idempotency_key` generated by the Worker for that validation request

The Worker does not send `remoteip`. DbState does not store applicant IP addresses as part of this contract.

The Worker requires:

- `success = true`
- `action = private-beta-application`
- `hostname` equal to `dbstate.com` or `www.dbstate.com`

The Turnstile token is never stored in D1, logged, or returned in API responses.

The browser client stores the token only in memory. It resets verification after failed submissions, expiration, timeout, or widget errors. Tokens are not written to local storage, session storage, cookies, URLs, analytics, or persisted drafts.

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

After the response is prepared, the Worker schedules an internal notification email through the `PRIVATE_BETA_EMAIL` binding. The public response remains unchanged.

Notification delivery occurs only after the application row and initial status-history row are persisted. A notification failure does not roll back persistence, does not change the public `201` response, and does not create an automatic retry in this slice.

The internal notification is sent from `private-beta@dbstate.com` to `darwin@dbstate.com` and includes only:

- Application reference
- Applicant name
- Work email
- Company, team, or project
- Role
- First workflow selected
- PostgreSQL versions
- Submission timestamp
- Retention date

It does not include difficult-change narratives, schema-change process, reference-data process, release SQL process, evaluation goals, Git workflow narrative, customer data, Turnstile details, consent wording, or the full applicant record.

No applicant acknowledgment email is sent in this slice.

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

| Status | Code                          |
| ------ | ----------------------------- |
| 400    | `malformed_json`              |
| 403    | `origin_not_allowed`          |
| 405    | `method_not_allowed`          |
| 409    | `duplicate_application`       |
| 413    | `payload_too_large`           |
| 415    | `unsupported_media_type`      |
| 422    | `validation_failed`           |
| 422    | `turnstile_required`          |
| 422    | `turnstile_invalid`           |
| 422    | `turnstile_action_mismatch`   |
| 422    | `turnstile_hostname_mismatch` |
| 500    | `persistence_failed`          |
| 503    | `intake_disabled`             |
| 503    | `intake_not_configured`       |
| 503    | `turnstile_not_configured`    |
| 503    | `turnstile_unavailable`       |

Errors never expose stack traces, D1 error text, SQL, internal paths, binding names, applicant content, Turnstile tokens, Turnstile secrets, Siteverify response bodies, or Cloudflare internal error details.

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

Retention enforcement uses the stored `retention_until` value. Automated enforcement is implemented but remains disabled in committed production configuration.

The public Privacy page states that Private Beta application records are assigned a retention date 365 days after submission. Automated retention enforcement remains disabled until the Private Beta application process is activated and operationally verified.

Retention deletion does not change the request body, success response, error contract, duplicate rule, or Turnstile validation behavior. Retention deletion does not send applicant notifications.

## Stored Data Boundaries

The D1 schema does not store:

- IP address
- User agent
- Turnstile token
- Turnstile secret
- Attachments
- Cookies
- Session identifiers

## Later Work Required Before Enabling Intake

Before public intake can be enabled, later reviewed slices must switch both Worker and public page modes through the deployment process, install the production Turnstile secret, verify Cloudflare Email Service readiness, and run deployment validation.

The public Privacy page and privacy operations runbook now document the applicant data lifecycle. Future activation work still must verify operational privacy handling before public application submission starts.

This slice does not deploy and does not enable public application submission.

## Production migration evidence

Verified on 2026-07-23:

- Production database ID: `97cd3f79-cc4a-4b05-a397-05d6057ab38e`
- `0001_private_beta_applications.sql` is recorded as applied
- No production migrations remain pending
- `private_beta_applications` exists
- `private_beta_application_status_history` exists
- Required indexes exist
- Duplicate protection uses a unique index on `normalized_email, submission_bucket`
- Application count is `0`
- Status-history count is `0`
- No production application was inserted
- Public intake remains disabled
