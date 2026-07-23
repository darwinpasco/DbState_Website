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
the production build, Worker-runtime tests, and the Playwright browser test
suite.

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

The public Private Beta form remains disabled and disconnected. Worker tests
exercise the backend contract in `PRIVATE_BETA_INTAKE_MODE=test`; production
configuration remains `PRIVATE_BETA_INTAKE_MODE=disabled`.

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

The quality gate checks static routes, internal links, metadata, responsive
overflow, documentation navigation, disabled Private Beta intake behavior,
product screenshot semantics, and current product boundary statements.

These are structural accessibility checks for headings, labels, navigation,
keyboard focus movement, alternative text, `aria-current`, and disabled intake
status. They do not prove full accessibility compliance and do not replace
manual accessibility or visual review.

GitHub Actions runs the same quality gate on pull requests targeting `dev` and
pushes to `dev`. The workflow also runs Wrangler dry-run validation without
deploying, using secrets, or requiring Cloudflare credentials.

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

The current Worker runtime exists only for the Private Beta application API foundation. Public application intake remains disabled until a later reviewed slice connects form submission and provisions the required Cloudflare resources.

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

## Deferred Work

- Private Beta browser form submission is not implemented in this task.
- The Private Beta application API is present but production intake is disabled.
- No remote D1 database has been created or bound yet.
- Email notifications to `darwin@dbstate.com` from `private-beta@dbstate.com` are documented for later slices only and are not implemented.
- Analytics, cookies, authentication, and backend services are intentionally out of scope.
