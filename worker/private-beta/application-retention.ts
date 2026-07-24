import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
} from "./application-repository";

export const RETENTION_CRON = "17 3 * * *";
export const RETENTION_RUN_LOG = "private_beta_retention_run";

export interface ScheduledControllerLike {
  cron: string;
  scheduledTime: number;
}

export interface RetentionEnv {
  PRIVATE_BETA_DB?: D1DatabaseLike;
  PRIVATE_BETA_RETENTION_ENFORCEMENT_MODE?: string;
  PRIVATE_BETA_RETENTION_BATCH_SIZE?: string;
}

interface RetentionCandidate {
  application_id: string;
}

interface RetentionRunSummary {
  classification: string;
  scheduledAt: string;
  candidateCount?: number;
  deletedApplicationCount?: number;
  deletedHistoryCount?: number;
  moreDueRecords?: boolean;
  durationMs?: number;
}

export class RetentionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetentionConfigurationError";
  }
}

export class RetentionPersistenceError extends Error {
  constructor() {
    super("Private Beta retention failed");
    this.name = "RetentionPersistenceError";
  }
}

function safeInfo(summary: RetentionRunSummary) {
  console.info(RETENTION_RUN_LOG, summary);
}

function safeError(summary: RetentionRunSummary) {
  console.error(RETENTION_RUN_LOG, summary);
}

function parseBatchSize(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) {
    throw new RetentionConfigurationError(
      "PRIVATE_BETA_RETENTION_BATCH_SIZE must be an integer.",
    );
  }

  const parsed = Number.parseInt(value, 10);
  if (parsed < 1 || parsed > 500) {
    throw new RetentionConfigurationError(
      "PRIVATE_BETA_RETENTION_BATCH_SIZE must be between 1 and 500.",
    );
  }

  return parsed;
}

function parseMode(value: string | undefined) {
  if (value === "disabled" || value === "test" || value === "enabled") {
    return value;
  }

  throw new RetentionConfigurationError(
    "PRIVATE_BETA_RETENTION_ENFORCEMENT_MODE must be disabled, test, or enabled.",
  );
}

function sumStatementChanges(results: unknown[]) {
  return results.reduce<number>((total, result) => {
    const changes = (result as { meta?: { changes?: unknown } })?.meta?.changes;
    return total + (typeof changes === "number" ? changes : 0);
  }, 0);
}

async function countDueApplications(db: D1DatabaseLike, cutoffIso: string) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count
      FROM private_beta_applications
      WHERE retention_until <= ?`,
    )
    .bind(cutoffIso)
    .first<{ count: number }>();

  return Number(row?.count ?? 0);
}

function buildDeletionStatements(
  db: D1DatabaseLike,
  candidates: RetentionCandidate[],
  cutoffIso: string,
) {
  const statements: D1PreparedStatementLike[] = [];

  for (const candidate of candidates) {
    statements.push(
      db
        .prepare(
          `DELETE FROM private_beta_application_status_history
          WHERE application_id IN (
            SELECT application_id
            FROM private_beta_applications
            WHERE application_id = ?
              AND retention_until <= ?
          )`,
        )
        .bind(candidate.application_id, cutoffIso),
    );

    statements.push(
      db
        .prepare(
          `DELETE FROM private_beta_applications
          WHERE application_id = ?
            AND retention_until <= ?`,
        )
        .bind(candidate.application_id, cutoffIso),
    );
  }

  return statements;
}

export async function runPrivateBetaRetentionBatch(
  env: RetentionEnv,
  scheduledAt: Date,
) {
  const mode = parseMode(env.PRIVATE_BETA_RETENTION_ENFORCEMENT_MODE);
  const scheduledAtIso = scheduledAt.toISOString();

  if (mode === "disabled") {
    safeInfo({
      classification: "disabled",
      scheduledAt: scheduledAtIso,
    });
    return;
  }

  const batchSize = parseBatchSize(env.PRIVATE_BETA_RETENTION_BATCH_SIZE);

  if (!env.PRIVATE_BETA_DB) {
    throw new RetentionConfigurationError("PRIVATE_BETA_DB is not configured.");
  }

  const startedAt = Date.now();
  const db = env.PRIVATE_BETA_DB;

  const candidates = await db
    .prepare(
      `SELECT application_id
      FROM private_beta_applications
      WHERE retention_until <= ?
      ORDER BY retention_until ASC, application_id ASC
      LIMIT ?`,
    )
    .bind(scheduledAtIso, batchSize)
    .all<RetentionCandidate>();

  const selectedCandidates = candidates.results;
  if (selectedCandidates.length === 0) {
    safeInfo({
      classification: "completed",
      scheduledAt: scheduledAtIso,
      candidateCount: 0,
      deletedApplicationCount: 0,
      deletedHistoryCount: 0,
      moreDueRecords: false,
      durationMs: Date.now() - startedAt,
    });
    return;
  }

  const statements = buildDeletionStatements(
    db,
    selectedCandidates,
    scheduledAtIso,
  );

  try {
    const results = await db.batch(statements);
    const deletedHistoryCount = sumStatementChanges(
      results.filter((_result, index) => index % 2 === 0),
    );
    const deletedApplicationCount = sumStatementChanges(
      results.filter((_result, index) => index % 2 === 1),
    );
    const remainingDueCount = await countDueApplications(db, scheduledAtIso);

    safeInfo({
      classification: "completed",
      scheduledAt: scheduledAtIso,
      candidateCount: selectedCandidates.length,
      deletedApplicationCount,
      deletedHistoryCount,
      moreDueRecords: remainingDueCount > 0,
      durationMs: Date.now() - startedAt,
    });
  } catch {
    safeError({
      classification: "failed",
      scheduledAt: scheduledAtIso,
      candidateCount: selectedCandidates.length,
      durationMs: Date.now() - startedAt,
    });
    throw new RetentionPersistenceError();
  }
}

export async function handlePrivateBetaRetentionScheduled(
  controller: ScheduledControllerLike,
  env: RetentionEnv,
) {
  const scheduledAt = new Date(controller.scheduledTime);
  const scheduledAtIso = scheduledAt.toISOString();

  if (controller.cron !== RETENTION_CRON) {
    safeInfo({
      classification: "unexpected_cron",
      scheduledAt: scheduledAtIso,
    });
    return;
  }

  try {
    await runPrivateBetaRetentionBatch(env, scheduledAt);
  } catch (error) {
    if (error instanceof RetentionPersistenceError) {
      throw error;
    }

    safeError({
      classification: "configuration_failed",
      scheduledAt: scheduledAtIso,
    });
    throw error;
  }
}
