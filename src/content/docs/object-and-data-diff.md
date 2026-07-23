---
title: Object and Data Diff
description: Understand how DbState separates object-level review from row-level reference-data review.
section: Schema workflows
order: 20
keywords:
  - Object Diff
  - Data Diff
  - review
---

State classifications are useful, but they are not enough for database review. DbState provides focused review surfaces so teams can inspect what changed before deciding what should happen next.

## Object Diff

Object Diff is for database objects such as tables, views, functions, triggers, constraints, grants, and policies.

It shows repository and database definitions for a selected object. Reviewers can inspect the object definition rather than relying only on a status label such as `Different`.

Object Diff helps answer:

- What does the repository define?
- What does the target PostgreSQL database currently contain?
- Is the difference supported as a Release Plan candidate?
- Does the difference require manual review?

Object Diff does not automatically merge SQL definitions or resolve conflicts.

## Data Diff

Data Diff is for repository-managed reference-data rows.

It shows row state across repository YAML and PostgreSQL:

- Repository only
- Database only
- Different
- In sync

Row state is a starting point for review, not an instruction to execute data changes.

Repository-to-Database reference-data comparison is read-only. The current Private Beta does not automatically generate reference-data `INSERT`, `UPDATE`, `DELETE`, or `MERGE` statements.

## Review outcome

Changed or unsupported objects may remain manual-review cases. Database-only rows may also require manual review because removal can have operational meaning outside the visible row comparison.

Continue with [Release Plans](/docs/release-plans/) when supported schema differences are ready for release handoff.
