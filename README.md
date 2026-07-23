# DbState Website

Public website foundation for DbState, a Git-native database state management and review tool.

DbState helps PostgreSQL teams compare a database with repository-defined desired state, capture database objects into durable repository files, manage selected reference data as YAML, review object-level and row-level differences, and generate review-only release artifacts.

DbState is not a direct database deployment tool.

## Technology Stack

- Astro with static site output
- TypeScript in strict mode
- Tailwind CSS through the official `@tailwindcss/vite` integration
- npm
- Prettier with Astro formatting support
- Playwright for site-wide browser quality checks
- Vitest with the Cloudflare Workers test pool for Worker-runtime API tests

No client framework, component library, analytics, authentication, or general backend service is included in this foundation.

## Prerequisites

- Node.js 22.12.0 or newer
- npm 11 or newer

This project was initialized with Node.js 24.16.0 and npm 11.13.0.

## Installation

```sh
npm install
```

On Windows PowerShell systems that block `npm.ps1`, use:

```sh
npm.cmd install
```

## Development

```sh
npm run dev
```

The local development server defaults to `http://localhost:4321`.

## Validation

```sh
npm run format:check
npm run check
npm run build
npm run validate:wrangler-config
npm run test:worker
npm run test:e2e
```

Or run the combined validation script:

```sh
npm run validate
```

Run the full quality gate:

```sh
npm run quality
```

`npm run quality` runs formatting verification, Astro and TypeScript checks,
the production build, focused Wrangler configuration validation,
Worker-runtime tests, and the Playwright browser test suite.

## Worker API Tests

The repository includes a Worker-runtime test suite for the Private Beta
application API foundation. The suite uses `@cloudflare/vitest-pool-workers`
with a locally simulated D1 binding named `PRIVATE_BETA_DB`.

```sh
npm run test:worker
```

Watch mode:

```sh
npm run test:worker:watch
```

The Worker test wrapper keeps Wrangler logs inside the ignored `.wrangler/`
directory so tests do not depend on a user-profile log path.

The public Private Beta form defaults to closed intake. Worker tests exercise
the backend contract in `PRIVATE_BETA_INTAKE_MODE=test`; production
configuration remains `PRIVATE_BETA_INTAKE_MODE=disabled`.

The Worker API also includes server-side Cloudflare Turnstile validation for
future application submissions. Tests inject deterministic Siteverify responses.
The browser form loads Turnstile only in focused client test builds or a future
enabled public build.

## D1 Operations

The Private Beta application API uses one configured D1 binding:

```text
PRIVATE_BETA_DB
```

The production database is `dbstate-private-beta`; the preview database ID is
also recorded in `wrangler.jsonc`. Validate the expected binding, disabled
intake mode, and selective Worker-first routing with:

```sh
npm run validate:wrangler-config
```

Remote migration scripts target the configured `PRIVATE_BETA_DB` D1 binding.
Remote preview operations use both `--remote --preview` and the configured
`preview_database_id`; production operations use `--remote` and the configured
`database_id`. They must be run only as explicit Cloudflare operations:

```sh
npm run d1:migrations:list:preview
npm run d1:migrations:apply:preview
npm run d1:migrations:list:production
npm run d1:migrations:apply:production
```

These scripts are not part of normal validation or `npm run quality`. Do not
apply remote migrations as part of routine website checks.

See `docs/private-beta-d1-operations.md` for the current D1 operational
boundary.

## Turnstile Operations

The provisioned Cloudflare Turnstile widget is `DbState Private Beta` in
Managed mode. The public sitekey and non-secret policy settings are configured
in `wrangler.jsonc`:

```text
TURNSTILE_SITE_KEY=0x4AAAAAAD7ybcKG7AdVbfGm
TURNSTILE_EXPECTED_ACTION=private-beta-application
TURNSTILE_EXPECTED_HOSTNAMES=dbstate.com,www.dbstate.com
```

The production secret must be installed only as a Worker secret named
`TURNSTILE_SECRET_KEY`. Do not commit, print, log, or document the secret value.

Server-side validation calls Cloudflare Siteverify before D1 persistence when
intake is in Worker test mode or a future enabled mode. The current public build
remains disabled and does not load the Turnstile browser widget. Focused client
tests use Cloudflare's always-pass public test sitekey and mocked API responses.

See `docs/private-beta-turnstile-operations.md` for the operational boundary and
future secret-installation notes.

## Browser Quality Gate

The repository includes Playwright tests for site-wide browser validation.
The tests run against Astro static preview at `http://127.0.0.1:4321`, not
Wrangler tunnel mode, Cloudflare OAuth, or a live deployment.

Install the Chromium browser used by Playwright:

```sh
npm run test:e2e:install
```

Run the headless browser suite:

```sh
npm run test:e2e
```

Run the same suite in headed mode for local debugging:

```sh
npm run test:e2e:headed
```

Run the focused Private Beta client-form integration suite:

```sh
npm run test:e2e:private-beta-client
```

Run it in headed mode:

```sh
npm run test:e2e:private-beta-client:headed
```

The focused client suite serves an Astro build with:

```text
PUBLIC_PRIVATE_BETA_INTAKE_MODE=test
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

That test mode renders Turnstile explicitly, exercises same-origin JSON
submission through mocked browser API responses, and does not contact remote D1,
install secrets, or enable production intake.

The quality gate checks static routes, internal links, metadata, responsive
overflow, documentation navigation, disabled Private Beta intake behavior,
product screenshot semantics, and current product boundary statements.

These are structural accessibility checks for headings, labels, navigation,
keyboard focus movement, alternative text, `aria-current`, and disabled intake
status. They do not prove full accessibility compliance and do not replace
manual accessibility or visual review.

GitHub Actions runs the same quality gate on pull requests targeting `dev` and
pushes to `dev`, then runs the focused Private Beta client-form suite in test
mode. The workflow also runs Wrangler dry-run validation without deploying,
using secrets, or requiring Cloudflare credentials.

## Formatting

```sh
npm run format
```

## Production Build

```sh
npm run build
npm run preview
```

## Directory Overview

```text
src/
  components/
    layout/       Shared section layout primitives
    navigation/   Header and footer navigation
    sections/     Homepage sections
    ui/           Focused reusable UI elements
  data/           Shared structured site data
  layouts/        HTML document shell and shared page layout
  pages/          Astro routes
  styles/         Global CSS and design tokens
public/           Static public assets
```

## Product Positioning Constraints

Website copy must stay aligned with the current product boundary:

- PostgreSQL-focused
- Git-native database state management and review
- Review-only release artifacts
- No direct database apply
- No generated SQL execution
- No automatic Git commits, pushes, pulls, tags, or hidden migrations
- No destructive SQL generation by default
- PostgreSQL passwords are not stored

Do not add unsupported database engines, deployment automation claims, fake customer logos, testimonials, usage statistics, pricing, or production-readiness claims without explicit product approval.

## Metadata and Deployment Notes

Cloudflare Workers is the selected deployment target for the DbState website.

Astro generates a fully static site. `npm run build` generates the website under `dist/`:

```sh
npm run build
```

`wrangler.jsonc` identifies `dist/` as the Cloudflare Workers static asset directory and configures a minimal Worker entry point for selective API routing. Normal website pages and assets remain asset-first. Only `/api/private-beta-applications` is configured with `assets.run_worker_first`.

The Astro Cloudflare adapter is not required while every public page route is prerendered.

Local Cloudflare-compatible preview:

```sh
npm run preview
```

Local Astro static preview used by automated tests:

```sh
npm run preview:astro
```

Deployment commands:

```sh
npm run deploy
```

Cloudflare branch builds may use `wrangler versions upload`. Production deployment uses `wrangler deploy`.

The current Worker runtime exists only for the Private Beta application API.
Public application intake remains disabled until a later reviewed slice changes
both the Worker intake mode and public build mode, installs the production
Turnstile secret, and completes the required Cloudflare operational steps.

Set `SITE_URL` before deployment so Astro can generate canonical URLs and Open Graph URLs:

```sh
SITE_URL=https://dbstate.com npm run build
```

The canonical production domain is `https://dbstate.com`.

The default robots metadata is currently `noindex, nofollow`, appropriate for a development-stage public website foundation. Revisit this before public launch.

## Manual Visual Review Checklist

Automated tests are a quality gate, not the full review process. Before merging
substantial website changes, manually inspect:

- 390px, 768px, 1024px, and 1440px viewports
- Header and footer navigation
- Homepage hierarchy and first-scroll story
- Product workflow models
- Safety boundaries
- Private Beta disabled intake state
- Documentation sidebar and article navigation
- Product screenshots and full-size screenshot links
- Keyboard focus states
- Color contrast and text readability
- Direct refresh of nested routes
- Static 404 page

## Private Beta Intake Modes

The browser page and Worker use separate controls.

Worker runtime mode is configured through `PRIVATE_BETA_INTAKE_MODE` in
`wrangler.jsonc`; the committed production value remains:

```text
PRIVATE_BETA_INTAKE_MODE=disabled
```

Public page behavior is selected at build time with
`PUBLIC_PRIVATE_BETA_INTAKE_MODE`:

- `disabled`: default. The questionnaire can be reviewed, the submit button is
  disabled, no Turnstile script loads, no API handler is installed, and no
  applicant information is transmitted to DbState.
- `test`: used only by focused browser tests. The page uses Cloudflare's
  always-pass public Turnstile test sitekey and mocked API responses.
- `enabled`: reserved for a later reviewed activation slice. It requires
  `PUBLIC_TURNSTILE_SITE_KEY`, renders Turnstile explicitly, and submits JSON to
  the same-origin API after verification.

The client stores Turnstile tokens only in memory, sends them only in the JSON
API request, resets verification after recoverable failures, and does not use
local storage, session storage, cookies, URL persistence, analytics, or draft
persistence.

The production Turnstile secret remains uninstalled. Email notification from
`private-beta@dbstate.com` to `darwin@dbstate.com` is still deferred.

## Deferred Work

- Production Private Beta browser form submission is not enabled.
- The Private Beta application API is present but production intake is disabled.
- Remote D1 production and preview IDs are configured, but migrations are not
  applied by this task.
- Server-side Turnstile validation is implemented for the Worker API, and the
  browser widget is wired for test-mode and future enabled builds. Production
  secret installation is deferred.
- Email notifications to `darwin@dbstate.com` from `private-beta@dbstate.com` are documented for later slices only and are not implemented.
- Analytics, cookies, authentication, and backend services are intentionally out of scope.
