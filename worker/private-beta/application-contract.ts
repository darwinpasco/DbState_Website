export const APPLICATION_ENDPOINT = "/api/private-beta-applications";

export const CONSENT_VERSION = "private-beta-application-v1";
export const MAX_REQUEST_BODY_BYTES = 32 * 1024;
export const APPLICATION_REFERENCE_PREFIX = "DBS-PB-";
export const INITIAL_APPLICATION_STATUS = "new";
export const SUCCESS_RESPONSE_STATUS = "received";
export const STATUS_HISTORY_CHANGED_BY = "system";
export const STATUS_HISTORY_INITIAL_NOTE = "Application received";
export const APPLICATION_SOURCE = "website";
export const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TURNSTILE_EXPECTED_ACTION = "private-beta-application";
export const TURNSTILE_EXPECTED_HOSTNAMES = ["dbstate.com", "www.dbstate.com"];
export const TURNSTILE_SITE_KEY = "0x4AAAAAAD7ybcKG7AdVbfGm";
export const TURNSTILE_TOKEN_MAX_LENGTH = 2048;
export const TURNSTILE_TIMEOUT_MS = 5_000;

export const workflowValues = [
  "schema-database-to-repository",
  "schema-repository-to-database",
  "reference-data-database-to-repository",
  "reference-data-repository-to-database",
] as const;

export const managesReferenceDataInGitValues = [
  "yes",
  "no",
  "partially",
] as const;

export const applicationStatusValues = [
  "new",
  "reviewing",
  "contacted",
  "accepted",
  "waitlisted",
  "declined",
  "withdrawn",
] as const;

export type FirstWorkflow = (typeof workflowValues)[number];
export type ManagesReferenceDataInGit =
  (typeof managesReferenceDataInGitValues)[number];
export type ApplicationStatus = (typeof applicationStatusValues)[number];

export interface PrivateBetaApplicationRequest {
  fullName: string;
  workEmail: string;
  companyTeamOrProject: string;
  role: string;
  postgresqlVersions: string;
  windowsVersion: string;
  otherDatabaseEngines?: string;
  gitWorkflow?: string;
  schemaChangeProcess: string;
  referenceDataProcess: string;
  databaseReviewers: string;
  releaseSqlProcess: string;
  difficultChange: string;
  firstWorkflow: FirstWorkflow;
  importantObjectTypes: string;
  managesReferenceDataInGit: ManagesReferenceDataInGit;
  evaluationGoals: string;
  processingConsent: true;
  futureUpdatesOptIn?: boolean;
  turnstileToken: string;
}

export interface NormalizedPrivateBetaApplicationRequest extends Omit<
  PrivateBetaApplicationRequest,
  "futureUpdatesOptIn" | "processingConsent" | "turnstileToken"
> {
  processingConsent: true;
  futureUpdatesOptIn: boolean;
  normalizedEmail: string;
}

export type StringField =
  | "fullName"
  | "workEmail"
  | "companyTeamOrProject"
  | "role"
  | "postgresqlVersions"
  | "windowsVersion"
  | "otherDatabaseEngines"
  | "gitWorkflow"
  | "schemaChangeProcess"
  | "referenceDataProcess"
  | "databaseReviewers"
  | "releaseSqlProcess"
  | "difficultChange"
  | "importantObjectTypes"
  | "evaluationGoals";

export const stringFieldLimits: Record<
  StringField,
  { min: number; max: number; required: boolean }
> = {
  fullName: { min: 2, max: 120, required: true },
  workEmail: { min: 3, max: 254, required: true },
  companyTeamOrProject: { min: 2, max: 160, required: true },
  role: { min: 2, max: 120, required: true },
  postgresqlVersions: { min: 1, max: 200, required: true },
  windowsVersion: { min: 1, max: 120, required: true },
  otherDatabaseEngines: { min: 0, max: 300, required: false },
  gitWorkflow: { min: 0, max: 1000, required: false },
  schemaChangeProcess: { min: 10, max: 2000, required: true },
  referenceDataProcess: { min: 10, max: 2000, required: true },
  databaseReviewers: { min: 2, max: 1000, required: true },
  releaseSqlProcess: { min: 10, max: 2000, required: true },
  difficultChange: { min: 20, max: 4000, required: true },
  importantObjectTypes: { min: 2, max: 1000, required: true },
  evaluationGoals: { min: 10, max: 2000, required: true },
};

export const allowedRequestFields = [
  ...Object.keys(stringFieldLimits),
  "firstWorkflow",
  "managesReferenceDataInGit",
  "processingConsent",
  "futureUpdatesOptIn",
  "turnstileToken",
] as const;
