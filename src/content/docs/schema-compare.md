---
title: Schema Compare
description: Compare PostgreSQL database objects in both directions while keeping database mutation and Git operations outside automatic DbState behavior.
section: Schema workflows
order: 10
keywords:
  - schema compare
  - database objects
  - Object Diff
---

Schema Compare has two explicit directions:

- Database to Repository
- Repository to Database

The direction matters because source, target, output, and safety boundaries are different.

## Database to Repository

In Database-to-Repository Schema Compare, PostgreSQL is the source and the Git repository is the target.

DbState inspects supported database objects, lets users select objects, and writes selected objects into durable repository files through an explicit workflow.

Typical output is repository-managed object files under `database/objects/`.

> **Safety boundary**
>
> Database-to-Repository Schema Compare writes repository files only. It does not mutate PostgreSQL and does not perform automatic Git operations.

## Repository to Database

In Repository-to-Database Schema Compare, the Git repository desired state is the source and PostgreSQL is the comparison target.

DbState reads repository-managed objects, reads PostgreSQL metadata, and compares the two states. The comparison is read-only from the database perspective.

State classifications include:

- Repository only
- Database only
- Different
- In sync

The classification is a review starting point. It is not an instruction to execute a change.

## Object Diff and Release Plans

For selected objects, Object Diff exposes repository and database definitions so reviewers can understand the actual difference.

Supported differences may become Release Plan candidates. Changed, destructive, database-only, or unsupported objects may remain manual-review cases.

> **Manual review**
>
> DbState does not directly apply changes, and generated SQL is not executed inside DbState.

See [Object and Data Diff](/docs/object-and-data-diff/) for review surfaces and [Release Plans](/docs/release-plans/) for review-only artifact handoff.
