export const workflowModes = [
  {
    stateType: "Schema",
    workflows: [
      {
        title: "Schema Compare: Database to Repository",
        direction: "Database to Repository",
        source: "PostgreSQL database",
        target: "Git repository",
        purpose:
          "Inspect supported PostgreSQL objects and write selected objects into durable repository files.",
        output: "Repository-managed database object files",
        safety:
          "Repository file writes only. No database mutation. No automatic Git operations.",
      },
      {
        title: "Schema Compare: Repository to Database",
        direction: "Repository to Database",
        source: "Git repository desired state",
        target: "PostgreSQL database",
        purpose:
          "Compare repository-managed objects against a target PostgreSQL database, inspect differences, build a release plan, and generate supported review-only SQL artifacts.",
        output: "Comparison results and review-only release artifacts",
        safety:
          "Read-only database comparison. No direct apply. No generated SQL execution.",
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
          "Choose reference-data tables, define key, versioned, ignored, and masked columns, preview generated YAML, and write approved files into the repository.",
        output: "Reference-data configuration and YAML files",
        safety:
          "Typed confirmation for repository writes. No database mutation. No automatic Git operations.",
      },
      {
        title: "Reference Data Compare: Repository to Database",
        direction: "Repository to Database",
        source: "Repository-managed YAML",
        target: "PostgreSQL database",
        purpose:
          "Compare repository-managed reference-data rows against PostgreSQL and inspect repository-only, database-only, different, and in-sync rows.",
        output: "Row-level Data Diff",
        safety:
          "Read-only comparison. No INSERT, UPDATE, DELETE, MERGE, or direct data apply in the current Private Beta scope.",
      },
    ],
  },
];

export const postgresqlCapabilityGroups = [
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

export const postgresqlScopeLimitations =
  "Current Private Beta scope does not yet include procedures, aggregates, window functions, default privileges, database-level or column-level privileges, ownership changes, or role membership grants.";

export const screenshotPlaceholders = [
  "Schema comparison",
  "Object Diff",
  "Reference Data Diff",
  "Release Plan",
];

export const intendedUsers = [
  "Database engineers",
  "Backend teams managing PostgreSQL schema and reference data",
  "Reviewers who need durable context for database changes",
  "Teams that want Git-centered review without direct database deployment",
];
