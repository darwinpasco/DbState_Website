# Private Beta Turnstile Operations

This document captures the current Cloudflare Turnstile operational boundary for the DbState Private Beta application API.

Public intake remains disabled. Do not deploy, install secrets, switch the public build to enabled mode, or enable application submission unless that work is explicitly approved in a later operational slice.

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

The public Privacy page discloses that Cloudflare may process browser and connection signals needed for bot detection and links to the Cloudflare Turnstile Privacy Addendum. DbState does not claim that Turnstile collects no personal information or that Turnstile processing is limited to a specific country.

## Disabled Public Intake

Production configuration remains:

```text
PRIVATE_BETA_INTAKE_MODE=disabled
```

While disabled, `POST /api/private-beta-applications` returns `503 intake_disabled` before request parsing, application-field validation, Turnstile validation, or D1 persistence.

## Browser Integration Boundary

The Private Beta browser form defaults to disabled closed-intake behavior.

In the default public build:

- `PUBLIC_PRIVATE_BETA_INTAKE_MODE` is missing or `disabled`
- no Turnstile browser script is loaded
- no Turnstile widget is rendered
- no API submission handler is installed
- the submit button remains disabled
- no information entered on the page is transmitted to or stored by DbState

Focused browser tests use:

```text
PUBLIC_PRIVATE_BETA_INTAKE_MODE=test
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

Test mode renders Turnstile explicitly, uses mocked API responses, and does not contact remote D1 or use the production Turnstile secret.

A future enabled build must provide the real public sitekey through:

```text
PUBLIC_TURNSTILE_SITE_KEY
```

Enabled mode must not use Cloudflare's test sitekey.

The Playwright quality gate continues to verify that the default production-style build is non-submitting and no Turnstile widget is loaded. A focused Playwright suite verifies the test-mode client integration.

## Client Token Lifecycle

The browser client loads:

```text
https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit
```

only in public `test` or future `enabled` mode.

The widget is rendered with:

```text
action=private-beta-application
theme=dark
```

On successful verification, the client stores the token in memory only and sends it as `turnstileToken` in the same-origin JSON API request.

The token is cleared and verification is reset when:

- the challenge expires
- the challenge reports an error
- the challenge times out
- the API returns a recoverable failure
- a network failure occurs
- the application succeeds

The token is not written to local storage, session storage, cookies, DOM data attributes, URL parameters, analytics, or persisted drafts.

## Test Behavior

Worker tests run with `PRIVATE_BETA_INTAKE_MODE=test` and inject deterministic mocked Siteverify responses.

Automated tests do not call the real Siteverify endpoint and do not use production Turnstile credentials.

The tests verify that failed Turnstile validation writes no D1 application rows or status-history rows.

Focused browser tests use Cloudflare's published always-pass public test sitekey and intercept the Turnstile browser script with a deterministic test double. Browser tests mock application API responses and do not use a test secret key in browser code.

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
- switch the public page mode to `enabled`
- switch the Worker intake mode through the deployment process
- run upload and deployment validation
- decide the operational rollout path
- verify internal email notification readiness
- verify public privacy documentation and applicant privacy operations for the enabled workflow
