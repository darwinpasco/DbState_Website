---
title: Workspace Setup
description: Set up a local Git repository that DbState can use as the desired-state workspace for database objects, reference data, and review artifacts.
section: Start here
order: 20
keywords:
  - workspace
  - Git
  - repository
---

A DbState workspace is a local Git repository that holds desired database state. The repository is the source of truth for what the database should look like during Repository-to-Database comparison.

The repository can be an existing project repository or a newly initialized repository created for database-state evaluation.

## Workspace repository path

DbState needs a local repository path so it can inspect workspace state and write repository-managed files through explicit workflows.

The workspace check verifies that the selected folder is usable as a Git repository. It does not imply that DbState will stage or commit files.

> **Safety boundary**
>
> Git history remains user-controlled. DbState does not automatically add, commit, push, pull, fetch, tag, create branches, or merge branches.

## Controlled repository folders

DbState writes database-state files under controlled folders. A representative structure is:

```text
database/
  objects/
    schemas/
    extensions/
    enums/
    sequences/
    tables/
    indexes/
    views/
    materialized-views/
    constraints/
    functions/
    triggers/
    grants/
    rls-policies/
  reference-data/
    dbstate.reference-data.yml
    tables/
  releases/
```

Exact folders appear as supported workflows create content.

## One durable object per file

Schema workflows store database objects as durable repository files. One object per file gives reviewers a smaller diff surface, clearer object identity, and a more explicit relationship between repository desired state and the target PostgreSQL database.

Repository files are not Git history by themselves. Review, staging, commits, branches, and release handoff remain normal Git decisions outside automatic DbState behavior.

## Reference-data folders

Reference-data workflows store table configuration and selected row state under the repository. Users choose which tables are reference data, define row identity, and decide which columns participate in comparison.

DbState does not automatically classify every table as reference data.

## Next workflows

After the workspace is ready, use [Schema Compare](/docs/schema-compare/) for database object workflows or [Reference Data](/docs/reference-data/) for repository-managed rows.
