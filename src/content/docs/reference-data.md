---
title: Reference Data
description: Manage selected PostgreSQL reference-data tables as repository YAML and compare row state without automatic data mutation.
section: Reference data
order: 10
keywords:
  - reference data
  - YAML
  - Data Diff
---

Reference data is application-meaningful row state that teams choose to manage in Git. Examples may include countries, statuses, categories, fee matrices, policy values, configuration rows, and lookup tables.

DbState does not automatically classify tables as reference data. Users explicitly select tables and define comparison rules.

## Reference-data configuration

The reference-data model separates:

- Key columns that identify rows
- Versioned columns that are compared
- Ignored columns that are excluded from comparison
- Masked columns that remain protected

A concise configuration example:

```yaml
version: 1
tables:
  - schema: public
    name: country
    keyColumns:
      - country_id
    ignoredColumns:
      - last_update
    maskedColumns: []
```

## Database to Repository

In Database-to-Repository Reference Data Compare, PostgreSQL is the source and the Git repository is the target.

Users select reference-data tables, define row identity and comparison behavior, preview YAML, and write approved repository files.

> **Safety boundary**
>
> Database-to-Repository reference-data capture writes repository files only. It does not mutate PostgreSQL and does not perform automatic Git operations.

## Repository to Database

In Repository-to-Database Reference Data Compare, repository-managed YAML is compared with PostgreSQL. The comparison is read-only.

Row classifications include:

- Repository only
- Database only
- Different
- In sync

A concise row example:

```yaml
rows:
  - country_id: 1
    country: Afghanistan
```

The current Private Beta does not automatically generate `INSERT`, `UPDATE`, `DELETE`, or `MERGE` for reference-data differences. It also does not directly apply data changes.

A database-only row may still be referenced by foreign keys or retain historical meaning. DbState does not treat removal as automatically safe.

See [Object and Data Diff](/docs/object-and-data-diff/) for row review and [Safety Model](/docs/safety-model/) for current boundaries.
