---
title: Known Limitations
description: Review the current Private Beta platform, workflow, database, and safety boundaries before evaluating DbState.
section: Trust and scope
order: 20
keywords:
  - limitations
  - Private Beta
  - PostgreSQL
---

The current Private Beta is intentionally scoped. Listing a limitation does not automatically mean a committed roadmap date exists.

## Platform and workflow boundaries

Current limitations include:

- Windows only
- PostgreSQL only
- Local workflow
- No hosted collaboration
- No shared server workspaces
- No automatic Git operations
- No direct database apply
- No generated SQL execution inside DbState
- No current automatic reference-data DML
- No automatic rollback
- No production-support or SLA claim
- No current macOS or Linux distribution

Remote repository synchronization, hosted approval workflows, and hosted audit trails are not part of the current Private Beta.

## PostgreSQL object support

Current Private Beta scope does not yet include procedures, aggregates, window functions, default privileges, database-level grants, column-level privileges, ownership changes, or role membership grants.

Unsupported object types or sensitive differences may remain manual-review cases.

## Product boundaries

DbState helps teams inspect, compare, capture, and prepare database changes for review. It does not execute database changes and does not control Git history.

Review the [Product](/product/) page for current capability scope or [request Private Beta access](/private-beta/) if the current boundaries match your evaluation workflow.
