# Private Beta D1 Operations

This document captures the current D1 operational boundary for the DbState Private Beta application API.

The public intake path remains disabled. Do not apply remote migrations, deploy the Worker, or enable browser form submission unless that work is explicitly approved in a later operational slice.

## Configured Databases

`wrangler.jsonc` contains one D1 binding:

```text
binding: PRIVATE_BETA_DB
database_name: dbstate-private-beta
database_id: 97cd3f79-cc4a-4b05-a397-05d6057ab38e
preview_database_id: 5b3e215c-0ecb-40eb-a4c4-794f913c9cee
migrations_dir: migrations
```

The generated Wrangler bindings `dbstate_private_beta` and `dbstate_private_beta_preview` must not be present. The binding must not include `remote: true`.

## Intake Mode

Production intake remains disabled:

```text
PRIVATE_BETA_INTAKE_MODE=disabled
```

While disabled, `POST /api/private-beta-applications` returns `503 intake_disabled` before request validation or persistence.

When intake is in Worker test mode or a future enabled mode, D1 persistence occurs only after application-field validation and server-side Turnstile Siteverify validation succeed.

## Static Asset Routing

The site remains asset-first. Only this path runs Worker code first:

```text
/api/private-beta-applications
```

Normal public pages and static assets should continue to be served through the static assets binding.

## Local Validation

Validate the expected Wrangler shape without contacting Cloudflare:

```sh
npm run validate:wrangler-config
```

The validation checks:

- exactly one D1 binding
- binding name `PRIVATE_BETA_DB`
- production and preview database IDs
- migrations directory `migrations`
- disabled intake mode
- static assets binding
- Worker-first routing limited to `/api/private-beta-applications`
- no `remote: true`
- no generated snake-case bindings
- non-secret Turnstile settings for the public sitekey, expected action, and expected hostnames

## Migration Scripts

Remote preview migration scripts target the configured `PRIVATE_BETA_DB`
binding with `--remote --preview`, which uses `preview_database_id`:

```sh
npm run d1:migrations:list:preview
npm run d1:migrations:apply:preview
```

Production migration scripts target the configured `PRIVATE_BETA_DB` binding
with `--remote`, which uses `database_id`:

```sh
npm run d1:migrations:list:production
npm run d1:migrations:apply:production
```

These scripts are intentionally explicit. Do not run them as part of normal website validation. Applying migrations modifies remote D1 state and must be performed as an intentional Cloudflare operation.

## Dry-Run Validation

Worker upload dry-run:

```sh
npx wrangler versions upload --dry-run
```

Deployment dry-run:

```sh
npx wrangler deploy --dry-run
```

Dry runs validate packaging and bindings without deploying or applying migrations.

In managed local environments where Wrangler cannot write logs under the user profile, set `WRANGLER_LOG_PATH` to an ignored local directory such as `.wrangler/logs`.

## Current Operational Boundaries

- Browser form submission remains disabled and disconnected.
- Public intake remains disabled.
- Worker tests use a locally simulated D1 binding and mocked Turnstile Siteverify responses.
- Remote migrations are not applied by validation or quality scripts.
- No email notification is implemented.
- Server-side Turnstile validation is implemented for the Worker API, but the browser widget is not connected yet.
- The production Turnstile secret is not stored in this repository.
- No deployment occurs from this repository task.

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