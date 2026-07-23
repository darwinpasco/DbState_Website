---
title: Release Plans
description: Build review-only handoffs for supported schema candidates without turning DbState into a database execution tool.
section: Release preparation
order: 10
keywords:
  - Release Plans
  - release artifacts
  - review-only
---

Release Plans help teams prepare a controlled handoff after Repository-to-Database Schema Compare.

They are not deployments.

## Review sequence

A typical Release Plan workflow is:

1. Run Repository-to-Database Schema Compare.
2. Inspect differences.
3. Open Object Diff.
4. Select supported candidates.
5. Build a Release Plan.
6. Prepare supported review-only artifacts.
7. Review the artifact externally.
8. Execute approved SQL outside DbState.

> **Safety boundary**
>
> Generated artifacts are not executed by DbState. Database execution remains outside DbState.

## Manual-review cases

Destructive or unsupported cases may remain manual-review cases. DbState does not pretend that every schema difference has a universally safe automated resolution.

Release Plans do not provide:

- Direct database apply
- Generated SQL execution inside DbState
- Automatic rollback
- Transactional deployment
- Automatic Git staging or commits

This page does not provide an exhaustive SQL support matrix. Use the current Private Beta documentation and product review surfaces to determine whether a specific difference is supported.

Review [Safety Model](/docs/safety-model/) and [Known Limitations](/docs/known-limitations/) before using release preparation workflows.
