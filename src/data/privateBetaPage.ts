type QuestionnaireField = {
  id: string;
  name: string;
  label: string;
  type: "text" | "email";
  required: boolean;
  minLength: number;
  maxLength: number;
  autocomplete?: string;
};

type QuestionnaireGroup = {
  legend: string;
  fields: QuestionnaireField[];
};

type QuestionnaireTextArea = {
  id: string;
  name: string;
  label: string;
  required: boolean;
  minLength: number;
  maxLength: number;
  featured?: boolean;
};

export const betaScopeGroups = [
  {
    title: "Platform",
    items: [
      "Windows",
      "Local service",
      "Browser-based interface",
      "Local developer workflow",
    ],
  },
  {
    title: "Database",
    items: [
      "PostgreSQL",
      "Saved non-secret connection profiles",
      "Password entered when needed",
      "PostgreSQL passwords are not stored",
    ],
  },
  {
    title: "Repository",
    items: [
      "Existing or newly initialized local Git repository",
      "Repository desired state under controlled DbState folders",
      "Database objects stored as files",
      "Reference data stored as YAML",
      "Git commands remain user-controlled",
    ],
  },
  {
    title: "Review workflow",
    items: [
      "Schema Compare",
      "Object Diff",
      "Reference Data Diff",
      "Release Plans",
      "Review-only release artifacts",
    ],
  },
];

export const suitableParticipantGroups = [
  {
    title: "Application developers",
    description:
      "Managing database changes beside application code and pull requests.",
  },
  {
    title: "Database engineers",
    description:
      "Comparing target PostgreSQL databases with repository desired state.",
  },
  {
    title: "Technical leads",
    description:
      "Trying to reduce undocumented manual changes and scattered release scripts.",
  },
  {
    title: "Regulated or audit-sensitive teams",
    description:
      "Seeking clearer database-state history, review evidence, and controlled handoff without claiming compliance certification.",
  },
];

export const requiredEnvironment = [
  "Windows development machine",
  "Local or reachable PostgreSQL database",
  "Git installed",
  "A local Git repository for desired database state",
  "Permission to inspect the selected PostgreSQL database",
  "Permission to write files into the local repository",
  "A non-production or otherwise safely controlled evaluation environment",
];

export const recommendedEnvironment = [
  "Existing schema-change review process",
  "Pull-request workflow",
  "Reference-data tables with stable row identity",
  "A representative development or test database",
];

export const evaluationWorkflows = [
  {
    title: "Capture an existing database into Git",
    description:
      "Use Database-to-Repository Schema Compare to capture selected PostgreSQL objects as durable files.",
  },
  {
    title: "Compare desired state with a target database",
    description:
      "Use Repository-to-Database Schema Compare to identify different, missing, database-only, and in-sync objects.",
  },
  {
    title: "Version reference data",
    description:
      "Select a lookup or configuration table, define row identity, and capture it as repository-managed YAML.",
  },
  {
    title: "Review row-level differences",
    description:
      "Compare repository-managed reference data with PostgreSQL through Data Diff.",
  },
  {
    title: "Build a Release Plan",
    description:
      "Select supported schema candidates and inspect the review surface before any database execution occurs outside DbState.",
  },
];

export const participantReceives = [
  "Access to the current Windows build",
  "Private Beta installation instructions",
  "Getting-started guidance",
  "Current known limitations",
  "Product workflow documentation",
  "A channel for structured feedback",
  "Early visibility into product decisions that affect local PostgreSQL workflows",
];

export const participantAsks = [
  "A real PostgreSQL workflow to evaluate",
  "Honest feedback about usability and terminology",
  "Reports of parsing, comparison, or workflow failures",
  "Clear reproduction steps when possible",
  "Feedback on schema and reference-data coverage",
  "Feedback on Release Plan and review boundaries",
  "Confirmation when product language is ambiguous or misleading",
];

export const betaIncluded = [
  "Local Windows workflow",
  "PostgreSQL inspection",
  "Explicit repository capture",
  "Read-only Repository-to-Database comparison",
  "Object Diff",
  "Data Diff",
  "Release Plans",
  "Review-only release artifacts",
  "User-controlled Git operations",
  "No stored PostgreSQL passwords",
];

export const betaNotIncluded = [
  "Direct database apply",
  "Generated SQL execution",
  "Automatic Git add, commit, push, pull, fetch, or tag",
  "Hosted collaboration",
  "Shared server workspaces",
  "Organization approval workflows",
  "Hosted audit trails",
  "Automatic rollback",
  "macOS and Linux builds",
  "Database engines other than PostgreSQL",
];

export const postgresPrivateBetaLimitations =
  "Current Private Beta scope does not yet include procedures, aggregates, window functions, default privileges, database-level grants, column-level privileges, ownership changes, or role membership grants.";

export const betaScopeLabels = [
  "PostgreSQL",
  "Windows",
  "Local workflow",
  "Git repository required",
  "Review-only artifacts",
  "Access by request",
];

export const questionnaireGroups: QuestionnaireGroup[] = [
  {
    legend: "Contact",
    fields: [
      {
        id: "name",
        name: "fullName",
        label: "Name",
        type: "text",
        required: true,
        minLength: 2,
        maxLength: 120,
        autocomplete: "name",
      },
      {
        id: "work-email",
        name: "workEmail",
        label: "Work email",
        type: "email",
        required: true,
        minLength: 3,
        maxLength: 254,
        autocomplete: "email",
      },
      {
        id: "company-team-project",
        name: "companyTeamOrProject",
        label: "Company, team, or project",
        type: "text",
        required: true,
        minLength: 2,
        maxLength: 160,
        autocomplete: "organization",
      },
      {
        id: "role",
        name: "role",
        label: "Role",
        type: "text",
        required: true,
        minLength: 2,
        maxLength: 120,
        autocomplete: "organization-title",
      },
    ],
  },
  {
    legend: "Technical environment",
    fields: [
      {
        id: "postgresql-versions",
        name: "postgresqlVersions",
        label: "PostgreSQL version or versions",
        type: "text",
        required: true,
        minLength: 1,
        maxLength: 200,
      },
      {
        id: "windows-version",
        name: "windowsVersion",
        label: "Windows version",
        type: "text",
        required: true,
        minLength: 1,
        maxLength: 120,
      },
      {
        id: "other-database-engines",
        name: "otherDatabaseEngines",
        label: "Other database engines currently used",
        type: "text",
        required: false,
        minLength: 0,
        maxLength: 300,
      },
      {
        id: "git-hosting-workflow",
        name: "gitWorkflow",
        label: "Git hosting or repository workflow, when applicable",
        type: "text",
        required: false,
        minLength: 0,
        maxLength: 1000,
      },
    ],
  },
];

export const questionnaireTextAreas: QuestionnaireTextArea[] = [
  {
    id: "schema-workflow",
    name: "schemaChangeProcess",
    label: "How are PostgreSQL schema changes managed today?",
    required: true,
    minLength: 10,
    maxLength: 2000,
  },
  {
    id: "reference-data-workflow",
    name: "referenceDataProcess",
    label: "How is reference data managed today?",
    required: true,
    minLength: 10,
    maxLength: 2000,
  },
  {
    id: "database-reviewers",
    name: "databaseReviewers",
    label: "Who reviews database changes?",
    required: true,
    minLength: 2,
    maxLength: 1000,
  },
  {
    id: "release-sql-process",
    name: "releaseSqlProcess",
    label: "How are release SQL scripts prepared and executed?",
    required: true,
    minLength: 10,
    maxLength: 2000,
  },
  {
    id: "difficult-change",
    name: "difficultChange",
    label:
      "Describe the last database change that was difficult to review, reproduce, or release.",
    required: true,
    minLength: 20,
    maxLength: 4000,
    featured: true,
  },
  {
    id: "first-workflow",
    name: "firstWorkflow",
    label: "Which DbState workflow would you evaluate first?",
    required: true,
    minLength: 1,
    maxLength: 120,
  },
  {
    id: "important-object-types",
    name: "importantObjectTypes",
    label: "Which PostgreSQL object types matter most?",
    required: true,
    minLength: 2,
    maxLength: 1000,
  },
  {
    id: "reference-data-git",
    name: "managesReferenceDataInGit",
    label: "Do you manage reference-data tables through Git today?",
    required: true,
    minLength: 1,
    maxLength: 20,
  },
  {
    id: "useful-evaluation",
    name: "evaluationGoals",
    label: "What would make the Private Beta evaluation useful?",
    required: true,
    minLength: 10,
    maxLength: 2000,
  },
];

export const sensitiveInformationList = [
  "Database passwords",
  "Connection strings containing credentials",
  "Private keys",
  "Customer records",
  "Production data",
  "Confidential SQL",
  "Proprietary schema definitions",
  "Access tokens",
];
