import {
  APPLICATION_REFERENCE_PREFIX,
  APPLICATION_SOURCE,
  CONSENT_VERSION,
  INITIAL_APPLICATION_STATUS,
  STATUS_HISTORY_CHANGED_BY,
  STATUS_HISTORY_INITIAL_NOTE,
  type NormalizedPrivateBetaApplicationRequest,
} from "./application-contract";

export type D1BoundValue = string | number | null;

export interface D1PreparedStatementLike {
  bind(...values: D1BoundValue[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch(statements: D1PreparedStatementLike[]): Promise<unknown[]>;
}

export interface PersistedApplication {
  applicationReference: string;
  submittedAt: string;
  retentionUntil: string;
}

export class DuplicateApplicationError extends Error {
  constructor() {
    super("Duplicate application");
    this.name = "DuplicateApplicationError";
  }
}

export class PersistenceError extends Error {
  constructor() {
    super("Application persistence failed");
    this.name = "PersistenceError";
  }
}

function generateUppercaseHex(byteCount: number) {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function isDuplicateConstraintError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /unique|constraint/i.test(error.message);
}

export function getUtcSubmissionBucket(date: Date) {
  return Math.floor(date.getTime() / 86_400_000);
}

export function getRetentionDate(date: Date) {
  return new Date(date.getTime() + 365 * 86_400_000);
}

export async function persistApplication(
  db: D1DatabaseLike,
  application: NormalizedPrivateBetaApplicationRequest,
  now = new Date(),
): Promise<PersistedApplication> {
  const applicationId = crypto.randomUUID();
  const statusHistoryId = crypto.randomUUID();
  const applicationReference = `${APPLICATION_REFERENCE_PREFIX}${generateUppercaseHex(6)}`;
  const submittedAt = now.toISOString();
  const updatedAt = submittedAt;
  const retentionUntil = getRetentionDate(now).toISOString();
  const submissionBucket = getUtcSubmissionBucket(now);

  const insertApplication = db
    .prepare(
      `INSERT INTO private_beta_applications (
        application_id,
        application_reference,
        full_name,
        work_email,
        normalized_email,
        company_team_project,
        role,
        postgresql_versions,
        windows_version,
        other_database_engines,
        git_workflow,
        schema_change_process,
        reference_data_process,
        database_reviewers,
        release_sql_process,
        difficult_change,
        first_workflow,
        important_object_types,
        manages_reference_data_in_git,
        evaluation_goals,
        processing_consent,
        future_updates_opt_in,
        consent_version,
        status,
        submission_bucket,
        source,
        submitted_at,
        updated_at,
        retention_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      applicationId,
      applicationReference,
      application.fullName,
      application.workEmail,
      application.normalizedEmail,
      application.companyTeamOrProject,
      application.role,
      application.postgresqlVersions,
      application.windowsVersion,
      application.otherDatabaseEngines ?? null,
      application.gitWorkflow ?? null,
      application.schemaChangeProcess,
      application.referenceDataProcess,
      application.databaseReviewers,
      application.releaseSqlProcess,
      application.difficultChange,
      application.firstWorkflow,
      application.importantObjectTypes,
      application.managesReferenceDataInGit,
      application.evaluationGoals,
      1,
      application.futureUpdatesOptIn ? 1 : 0,
      CONSENT_VERSION,
      INITIAL_APPLICATION_STATUS,
      submissionBucket,
      APPLICATION_SOURCE,
      submittedAt,
      updatedAt,
      retentionUntil,
    );

  const insertHistory = db
    .prepare(
      `INSERT INTO private_beta_application_status_history (
        status_history_id,
        application_id,
        status,
        changed_at,
        changed_by,
        note
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      statusHistoryId,
      applicationId,
      INITIAL_APPLICATION_STATUS,
      submittedAt,
      STATUS_HISTORY_CHANGED_BY,
      STATUS_HISTORY_INITIAL_NOTE,
    );

  try {
    await db.batch([insertApplication, insertHistory]);
  } catch (error) {
    if (isDuplicateConstraintError(error)) {
      throw new DuplicateApplicationError();
    }

    throw new PersistenceError();
  }

  return {
    applicationReference,
    submittedAt,
    retentionUntil,
  };
}
