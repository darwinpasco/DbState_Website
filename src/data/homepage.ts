export const workflowSteps = [
  {
    label: "Compare",
    description:
      "Inspect PostgreSQL database state against the desired state kept in the repository.",
  },
  {
    label: "Capture",
    description:
      "Store selected database objects and reference data as durable files for review.",
  },
  {
    label: "Review",
    description:
      "See object-level and row-level differences before release artifacts are prepared.",
  },
  {
    label: "Generate",
    description:
      "Create review-only release SQL artifacts without applying them to the database.",
  },
];

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
