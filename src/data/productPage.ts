export const operatingModelSteps = [
  {
    title: "Database inspection",
    description:
      "DbState reads PostgreSQL metadata and selected reference-data rows.",
  },
  {
    title: "Repository capture",
    description:
      "Explicit Database-to-Repository workflows write selected database objects or reference data into repository-managed files.",
  },
  {
    title: "State comparison",
    description:
      "Repository-to-Database workflows compare desired state against the target database.",
  },
  {
    title: "Release preparation",
    description:
      "Supported differences may be selected in a Release Plan and prepared as review-only artifacts.",
  },
  {
    title: "Execution boundary",
    description:
      "DbState does not execute generated SQL or directly mutate PostgreSQL during release workflows.",
  },
];

export const workflowRows = [
  {
    stateType: "Schema",
    workflows: [
      {
        title: "Schema Compare: Database to Repository",
        direction: "Database to Repository",
        source: "PostgreSQL database",
        target: "Git repository",
        purpose:
          "Inspect supported database objects and write selected objects into durable repository files.",
        output: "Repository-managed object files",
        safety:
          "Repository writes only. No PostgreSQL mutation. No automatic Git operations.",
        label: "repository writes only",
      },
      {
        title: "Schema Compare: Repository to Database",
        direction: "Repository to Database",
        source: "Git repository desired state",
        target: "PostgreSQL database",
        purpose:
          "Compare repository-managed objects with a target database, inspect differences, build a Release Plan, and prepare supported review-only artifacts.",
        output:
          "Comparison results, Object Diff, Release Plan, and review-only artifacts",
        safety:
          "Read-only database comparison. No direct apply. No generated SQL execution.",
        label: "read-only database compare",
      },
    ],
  },
  {
    stateType: "Reference data",
    workflows: [
      {
        title: "Reference Data Compare: Database to Repository",
        direction: "Database to Repository",
        source: "PostgreSQL database",
        target: "Git repository",
        purpose:
          "Select reference-data tables, define row identity and comparison rules, preview YAML, and write approved repository files.",
        output: "Reference-data configuration and YAML files",
        safety:
          "Explicit repository writes only. No PostgreSQL mutation. No automatic Git operations.",
        label: "explicit repository writes",
      },
      {
        title: "Reference Data Compare: Repository to Database",
        direction: "Repository to Database",
        source: "Repository-managed YAML",
        target: "PostgreSQL database",
        purpose:
          "Compare repository-managed rows with PostgreSQL and inspect row-level state.",
        output: "Data Diff",
        safety:
          "Read-only comparison. No automatic INSERT, UPDATE, DELETE, MERGE, or direct data apply in the current Private Beta.",
        label: "read-only row compare",
      },
    ],
  },
];

export const repositoryObjectTree = `database/
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
    rls-policies/`;

export const schemaFileBenefits = [
  "Smaller Git diffs",
  "Easier pull-request review",
  "Clear object identity",
  "Better comparison with target databases",
  "More explicit release candidate selection",
];

export const referenceDataExamples = [
  "Countries",
  "Statuses",
  "Categories",
  "Fee matrices",
  "Policy values",
  "Configuration rows",
  "Lookup tables",
];

export const referenceDataRules = [
  "Users choose which tables are reference data",
  "Key columns identify rows",
  "Versioned columns are compared",
  "Ignored columns are excluded from comparison",
  "Masked columns remain protected",
];

export const referenceDataConfigurationExample = `version: 1
tables:
  - schema: public
    name: country
    keyColumns:
      - country_id
    ignoredColumns:
      - last_update
    maskedColumns: []`;

export const dataDiffStates = [
  "Repository only",
  "Database only",
  "Different",
  "In sync",
];

export const dataDiffSafetyBoundaries = [
  "Repository-to-Database reference-data comparison is read-only",
  "No automatic INSERT generation in the current Private Beta",
  "No automatic UPDATE generation in the current Private Beta",
  "No DELETE generation",
  "No MERGE generation",
  "No direct data apply",
];

export const releasePlanSteps = [
  "Compare repository desired state with PostgreSQL",
  "Inspect Object Diff",
  "Select supported release candidates",
  "Build a Release Plan",
  "Prepare supported review-only artifacts",
  "Review and execute approved SQL outside DbState",
];

export const postgresqlCoverageGroups = [
  {
    category: "Structure",
    objects: [
      "Schemas",
      "Extensions",
      "Enums",
      "Sequences",
      "Tables",
      "Indexes",
    ],
  },
  {
    category: "Query and derived objects",
    objects: ["Views", "Materialized views"],
  },
  {
    category: "Constraints",
    objects: [
      "Primary keys",
      "Unique constraints",
      "Foreign keys",
      "Check constraints",
    ],
  },
  {
    category: "Programmability",
    objects: ["Regular functions", "Triggers"],
  },
  {
    category: "Security",
    objects: ["Grants", "Row-level security policies"],
  },
  {
    category: "Data",
    objects: ["Reference data"],
  },
];

export const postgresqlCoverageLimitations =
  "Current Private Beta scope does not yet include procedures, aggregates, window functions, default privileges, database-level privileges, column-level privileges, ownership changes, or role membership grants.";

export const productBoundaries = [
  {
    title: "Local workflow",
    description: "Private Beta runs as a local Windows developer workflow.",
  },
  {
    title: "Git remains user-controlled",
    description:
      "DbState does not automatically add, commit, push, pull, fetch, or tag.",
  },
  {
    title: "Database execution remains external",
    description:
      "Generated artifacts are reviewed and executed through the team's normal database release process outside DbState.",
  },
  {
    title: "Collaboration is future scope",
    description:
      "Hosted workflows, shared workspaces, approval systems, and server-based collaboration are not part of the current Private Beta.",
  },
  {
    title: "PostgreSQL first",
    description:
      "The current product focuses on PostgreSQL. The database-state model may expand to additional relational database engines over time.",
  },
];

export const productBetaScope = [
  "PostgreSQL",
  "Windows",
  "Local workflow",
  "Git repository required",
  "Review-only release artifacts",
  "Access by request",
];
