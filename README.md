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

No client framework, component library, analytics, backend service, or authentication is included in this foundation.

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
```

Or run the combined validation script:

```sh
npm run validate
```

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

`wrangler.jsonc` identifies `dist/` as the Cloudflare Workers static asset directory. There is no Worker runtime entry point for the current website, and the Astro Cloudflare adapter is not required while every route is prerendered.

Local Cloudflare-compatible preview:

```sh
npm run preview
```

Deployment commands:

```sh
npm run deploy
```

Cloudflare branch builds may use `wrangler versions upload`. Production deployment uses `wrangler deploy`.

A Cloudflare adapter or Worker runtime may be reconsidered later only if DbState introduces server-rendered routes, API endpoints, sessions, runtime bindings, or backend form handling.

Set `SITE_URL` before deployment so Astro can generate canonical URLs and Open Graph URLs:

```sh
SITE_URL=https://example.com npm run build
```

Do not use `https://example.com` as the real production value. Replace it with the selected DbState public website domain when that decision is made.

The default robots metadata is currently `noindex, nofollow`, appropriate for a development-stage public website foundation. Revisit this before public launch.

## Deferred Work

- Private Beta form submission is not implemented in this task.
- Documentation architecture and content collections are not implemented yet.
- Real product screenshots are not included yet.
- Analytics, cookies, authentication, and backend services are intentionally out of scope.
