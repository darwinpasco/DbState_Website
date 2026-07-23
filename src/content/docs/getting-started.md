---
title: Getting Started
description: Understand what DbState is, what the Private Beta includes, and how to approach a first local PostgreSQL evaluation.
section: Start here
order: 10
keywords:
  - private beta
  - setup
  - PostgreSQL
---

DbState is a Git-native database state management and review tool.

It compares PostgreSQL database state with desired state stored in a Git repository. It helps teams capture database objects as durable files, manage selected reference data as YAML, inspect differences, build Release Plans, and prepare supported review-only release artifacts.

> **Safety boundary**
>
> Database execution remains outside DbState.

## Current Private Beta scope

The current Private Beta focuses on:

- PostgreSQL
- Windows
- Local developer workflow
- Local service and browser interface
- Git repository as desired state
- Schema Compare
- Object Diff
- Reference Data Compare
- Data Diff
- Release Plans
- Review-only release artifacts
- Explicit repository writes
- User-controlled Git operations
- No stored PostgreSQL passwords

Installation instructions are provided with Private Beta access. This documentation does not invent installer names, package filenames, or deployment steps that are not part of the public website.

## Prerequisites

Before evaluating DbState, prepare:

- A Windows development machine
- A local or reachable PostgreSQL database
- Git installed
- A local Git repository to hold desired database state
- Permission to inspect the selected PostgreSQL database
- Permission to write files into the local repository
- A non-production or otherwise safely controlled evaluation environment

DbState is intended to help review database state. Do not use the Private Beta as an unreviewed production deployment mechanism.

## First-run sequence

A typical first evaluation follows this order:

1. Start DbState using the Private Beta instructions.
2. Open the local browser interface.
3. Select a workspace repository path.
4. Run the workspace check so DbState can verify the local Git repository.
5. Select or configure a PostgreSQL connection profile.
6. Enter the PostgreSQL password when needed.
7. Test the connection.
8. Capture selected database objects or reference data into the repository.
9. Compare repository desired state with a target database.
10. Inspect differences before deciding what belongs in a Release Plan.

Saved connection profiles may retain non-secret connection settings. PostgreSQL passwords are entered when needed and are not stored by DbState.

## Where to go next

Start with [Workspace Setup](/docs/workspace-setup/) to prepare a repository for desired state. Review [Safety Model](/docs/safety-model/) before using Repository-to-Database workflows.
