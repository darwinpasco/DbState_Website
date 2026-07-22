export const safetyModelMainPath = [
  {
    title: "PostgreSQL Database",
    label: "source database",
    detail: "Target database metadata and selected rows are read by DbState.",
  },
  {
    title: "Database Inspection",
    label: "read",
    detail: "Inspection gathers state without mutating PostgreSQL.",
  },
  {
    title: "State Comparison",
    label: "compare",
    detail: "Repository desired state is compared with database state.",
  },
  {
    title: "Object Diff / Data Diff",
    label: "review",
    detail: "Differences are exposed for human inspection.",
  },
  {
    title: "Release Plan",
    label: "select",
    detail: "Supported candidates can be selected for a handoff plan.",
  },
  {
    title: "Review-only Artifact",
    label: "prepare",
    detail: "Artifacts are prepared for review, not executed by DbState.",
  },
  {
    title: "External Database Release Process",
    label: "controlled handoff",
    detail: "Approved SQL is executed outside DbState.",
  },
];

export const capturePath = [
  {
    title: "PostgreSQL Database",
    label: "source",
  },
  {
    title: "Repository-managed files",
    label: "explicit capture",
  },
];

export const safetyModelBoundaries = [
  "Database reads are distinct from repository writes",
  "Repository writes occur through explicit workflows",
  "Comparison does not mutate PostgreSQL",
  "Release Plans do not execute SQL",
  "Review-only artifacts remain external handoff inputs",
  "Git operations remain outside automatic DbState behavior",
];

export const databaseExecutionPoints = [
  "DbState does not directly apply generated SQL",
  "DbState does not execute review-only release artifacts",
  "Repository-to-Database comparison is read-only",
  "Users review approved SQL through their existing database release process",
  "The database remains unchanged unless a user acts outside DbState",
];

export const repositoryWriteTargets = [
  "Database object files",
  "Reference-data configuration",
  "Reference-data YAML",
  "Review-only release artifacts",
];

export const repositoryWriteBoundaries = [
  "Writes occur only through an explicit user workflow",
  "Selection and confirmation are required where implemented",
  "DbState writes only under controlled repository folders",
  "Repository writes do not imply Git staging or Git history changes",
  "No PostgreSQL mutation occurs during capture",
];

export const gitOperationsOutsideDbState = [
  "Add",
  "Commit",
  "Push",
  "Pull",
  "Fetch",
  "Tag",
  "Rewrite history",
  "Create branches",
  "Merge branches",
];

export const manualReviewExamples = [
  "Dropping tables",
  "Dropping columns",
  "Dropping constraints",
  "Dropping functions",
  "Revoking grants",
  "Ownership changes",
  "Default privilege changes",
  "Row-level security mode changes",
];

export const referenceDataSafetyPoints = [
  "Users explicitly choose which tables are reference data",
  "Key columns identify rows",
  "Ignored columns do not create differences",
  "Masked columns remain protected",
  "Repository-to-Database comparison is read-only",
  "The current Private Beta does not automatically generate INSERT, UPDATE, DELETE, or MERGE for reference-data differences",
  "Database-only rows remain manual-review cases",
];

export const artifactHandoffSteps = [
  "Compare repository desired state with PostgreSQL",
  "Inspect Object Diff or Data Diff",
  "Select supported release candidates",
  "Build a Release Plan",
  "Prepare supported review-only artifacts",
  "Review the artifact",
  "Execute approved SQL outside DbState using the team's normal release process",
];

export const nonGuarantees = [
  "Error-free SQL",
  "Zero production incidents",
  "Complete detection of every destructive consequence",
  "Automatic rollback",
  "Transactional deployment",
  "Regulatory compliance",
  "Complete separation of duties",
  "Approval enforcement",
  "A complete hosted audit trail",
  "Correctness of externally modified repository files",
  "Correctness of SQL executed outside DbState",
];

export const privateBetaIncluded = [
  "Local Windows workflow",
  "PostgreSQL database inspection",
  "Explicit repository capture",
  "Read-only Repository-to-Database comparison",
  "Object Diff",
  "Data Diff",
  "Release Plans",
  "Review-only release artifacts",
  "User-controlled Git operations",
  "No stored PostgreSQL passwords",
];

export const privateBetaNotIncluded = [
  "Direct database apply",
  "Generated SQL execution",
  "Automatic Git operations",
  "Hosted collaboration",
  "Shared server workspaces",
  "Organization approval workflows",
  "Hosted policy enforcement",
  "Hosted audit trails",
  "Automatic rollback",
  "Database engines other than PostgreSQL",
];

export const postgresSafetyScopeLimitations =
  "Current Private Beta scope does not yet include procedures, aggregates, window functions, default privileges, database-level grants, column-level privileges, ownership changes, or role membership grants.";

export const safetyBetaScopeLabels = [
  "PostgreSQL",
  "Windows",
  "Local workflow",
  "Git repository required",
  "Review-only artifacts",
  "Access by request",
];
