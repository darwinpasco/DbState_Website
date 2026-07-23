# Private Beta Turnstile Operations

This document captures the current Cloudflare Turnstile operational boundary for the DbState Private Beta application API.

Public intake remains disabled. Do not deploy, install secrets, connect the browser widget, or enable form submission unless that work is explicitly approved in a later operational slice.

## Provisioned Widget

```text
Widget name: DbState Private Beta
Mode: Managed
Public sitekey: 0x4AAAAAAD7ybcKG7AdVbfGm
Expected action: private-beta-application
Authorized hostnames: dbstate.com, www.dbstate.com
```

The public sitekey is non-secret and is recorded in `wrangler.jsonc` as `TURNSTILE_SITE_KEY`.

## Worker Configuration

`wrangler.jsonc` contains only non-secret Turnstile settings:

```text
TURNSTILE_SITE_KEY=0x4AAAAAAD7ybcKG7AdVbfGm
TURNSTILE_EXPECTED_ACTION=private-beta-application
TURNSTILE_EXPECTED_HOSTNAMES=dbstate.com,www.dbstate.com
```

The production secret must be available only as a Worker secret named:

```text
TURNSTILE_SECRET_KEY
```

Do not store the secret in `wrangler.jsonc`, README, tests, snapshots, local documentation, browser code, or GitHub Actions.

## Server-Side Validation

The Worker validates every accepted application request through Cloudflare Siteverify before D1 persistence:

```text
POST https://challenges.cloudflare.com/turnstile/v0/siteverify
```

The Worker sends:

- `secret` from `env.TURNSTILE_SECRET_KEY`
- `response` from the submitted `turnstileToken`
- `idempotency_key` generated for the validation request

The Worker does not send `remoteip`. DbState does not store or process applicant IP addresses in this contract slice.

The Worker requires:

- `success = true`
- `action = private-beta-application`
- `hostname` equal to `dbstate.com` or `www.dbstate.com`

Tokens are not cached, persisted, logged, or returned in API responses.

## Disabled Public Intake

Production configuration remains:

```text
PRIVATE_BETA_INTAKE_MODE=disabled
```

While disabled, `POST /api/private-beta-applications` returns `503 intake_disabled` before request parsing, application-field validation, Turnstile validation, or D1 persistence.

## Browser Integration Boundary

The Private Beta browser form remains disabled and disconnected.

This slice does not add:

- Turnstile browser widget markup
- Turnstile client script
- form submission JavaScript
- field `name` attributes
- an enabled submit button
- public intake

The Playwright quality gate continues to verify that the form is non-submitting and no Turnstile widget is loaded yet.

## Test Behavior

Worker tests run with `PRIVATE_BETA_INTAKE_MODE=test` and inject deterministic mocked Siteverify responses.

Automated tests do not call the real Siteverify endpoint and do not use production Turnstile credentials.

The tests verify that failed Turnstile validation writes no D1 application rows or status-history rows.

## Secret Installation Boundary

The production secret is not installed by this task.

Future secret setup should use a reviewed operational path. Be careful with Wrangler secret commands:

```sh
wrangler secret put TURNSTILE_SECRET_KEY
```

That command can create and immediately deploy a Worker version. For versioned rollout, prefer a reviewed dashboard change or:

```sh
wrangler versions secret put TURNSTILE_SECRET_KEY
```

Do not run either command from routine validation.

## Later Work Required

Before public intake can be enabled, later reviewed slices must:

- install the production Turnstile secret
- connect the browser-side Turnstile widget
- connect form submission
- verify D1 migrations in the intended remote environments
- run upload and deployment validation
- decide the operational rollout path
- update public privacy documentation if application intake starts collecting submitted answers
