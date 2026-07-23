import {
  allowedRequestFields,
  managesReferenceDataInGitValues,
  stringFieldLimits,
  TURNSTILE_TOKEN_MAX_LENGTH,
  workflowValues,
  type FirstWorkflow,
  type ManagesReferenceDataInGit,
  type NormalizedPrivateBetaApplicationRequest,
  type StringField,
} from "./application-contract";

export interface ValidationSuccess {
  ok: true;
  value: NormalizedPrivateBetaApplicationRequest;
  turnstileToken: string;
}

export interface FieldValidationFailure {
  ok: false;
  kind: "fields";
  fields: Record<string, string>;
}

export interface TurnstileTokenValidationFailure {
  ok: false;
  kind: "turnstile";
  code: "turnstile_required" | "turnstile_invalid";
  message: string;
}

export type ValidationResult =
  ValidationSuccess | FieldValidationFailure | TurnstileTokenValidationFailure;

const allowedFields = new Set<string>(allowedRequestFields);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sensitiveContentPattern =
  /(password|connection\s*string|access\s*token|private\s*key|-----BEGIN|postgres(?:ql)?:\/\/)/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function validateStringField(
  input: Record<string, unknown>,
  field: StringField,
  errors: Record<string, string>,
): string | undefined {
  const limits = stringFieldLimits[field];
  const rawValue = input[field];

  if (rawValue === undefined) {
    if (limits.required) {
      errors[field] = "This field is required.";
    }
    return undefined;
  }

  if (typeof rawValue !== "string") {
    errors[field] = "Expected a string value.";
    return undefined;
  }

  const value = rawValue.trim();

  if (limits.required && value.length === 0) {
    errors[field] = "This field is required.";
    return undefined;
  }

  if (value.length < limits.min || value.length > limits.max) {
    errors[field] =
      `Must be between ${limits.min} and ${limits.max} characters.`;
    return undefined;
  }

  if (sensitiveContentPattern.test(value)) {
    errors[field] = "Do not include credentials or sensitive content.";
    return undefined;
  }

  return value;
}

function validateEnum<T extends readonly string[]>(
  input: Record<string, unknown>,
  field: string,
  values: T,
  errors: Record<string, string>,
): T[number] | undefined {
  const rawValue = input[field];

  if (rawValue === undefined) {
    errors[field] = "This field is required.";
    return undefined;
  }

  if (typeof rawValue !== "string") {
    errors[field] = "Expected a string value.";
    return undefined;
  }

  const value = rawValue.trim();

  if (!values.includes(value)) {
    errors[field] = "Select a supported value.";
    return undefined;
  }

  return value;
}

export function validateApplicationRequest(input: unknown): ValidationResult {
  const errors: Record<string, string> = {};

  if (!isRecord(input)) {
    return {
      ok: false,
      kind: "fields",
      fields: {
        request: "Expected a JSON object.",
      },
    };
  }

  for (const field of Object.keys(input)) {
    if (!allowedFields.has(field)) {
      errors[field] = "Unexpected field.";
    }
  }

  const fullName = validateStringField(input, "fullName", errors);
  const workEmail = validateStringField(input, "workEmail", errors);
  const companyTeamOrProject = validateStringField(
    input,
    "companyTeamOrProject",
    errors,
  );
  const role = validateStringField(input, "role", errors);
  const postgresqlVersions = validateStringField(
    input,
    "postgresqlVersions",
    errors,
  );
  const windowsVersion = validateStringField(input, "windowsVersion", errors);
  const otherDatabaseEngines = validateStringField(
    input,
    "otherDatabaseEngines",
    errors,
  );
  const gitWorkflow = validateStringField(input, "gitWorkflow", errors);
  const schemaChangeProcess = validateStringField(
    input,
    "schemaChangeProcess",
    errors,
  );
  const referenceDataProcess = validateStringField(
    input,
    "referenceDataProcess",
    errors,
  );
  const databaseReviewers = validateStringField(
    input,
    "databaseReviewers",
    errors,
  );
  const releaseSqlProcess = validateStringField(
    input,
    "releaseSqlProcess",
    errors,
  );
  const difficultChange = validateStringField(input, "difficultChange", errors);
  const importantObjectTypes = validateStringField(
    input,
    "importantObjectTypes",
    errors,
  );
  const evaluationGoals = validateStringField(input, "evaluationGoals", errors);

  const firstWorkflow = validateEnum(
    input,
    "firstWorkflow",
    workflowValues,
    errors,
  ) as FirstWorkflow | undefined;
  const managesReferenceDataInGit = validateEnum(
    input,
    "managesReferenceDataInGit",
    managesReferenceDataInGitValues,
    errors,
  ) as ManagesReferenceDataInGit | undefined;

  if (input.processingConsent !== true) {
    errors.processingConsent = "Processing consent is required.";
  }

  let futureUpdatesOptIn = false;
  if (input.futureUpdatesOptIn !== undefined) {
    if (typeof input.futureUpdatesOptIn !== "boolean") {
      errors.futureUpdatesOptIn = "Expected a boolean value.";
    } else {
      futureUpdatesOptIn = input.futureUpdatesOptIn;
    }
  }

  if (workEmail !== undefined) {
    const normalizedEmail = workEmail.toLowerCase();
    if (!emailPattern.test(normalizedEmail)) {
      errors.workEmail = "Enter a valid work email address.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      kind: "fields",
      fields: errors,
    };
  }

  const rawTurnstileToken = input.turnstileToken;

  if (rawTurnstileToken === undefined) {
    return {
      ok: false,
      kind: "turnstile",
      code: "turnstile_required",
      message: "Complete the verification before submitting the application.",
    };
  }

  if (typeof rawTurnstileToken !== "string") {
    return {
      ok: false,
      kind: "turnstile",
      code: "turnstile_invalid",
      message:
        "The verification could not be confirmed. Refresh the verification and try again.",
    };
  }

  const turnstileToken = rawTurnstileToken.trim();

  if (turnstileToken.length === 0) {
    return {
      ok: false,
      kind: "turnstile",
      code: "turnstile_required",
      message: "Complete the verification before submitting the application.",
    };
  }

  if (turnstileToken.length > TURNSTILE_TOKEN_MAX_LENGTH) {
    return {
      ok: false,
      kind: "turnstile",
      code: "turnstile_invalid",
      message:
        "The verification could not be confirmed. Refresh the verification and try again.",
    };
  }

  return {
    ok: true,
    turnstileToken,
    value: {
      fullName: fullName!,
      workEmail: workEmail!.toLowerCase(),
      normalizedEmail: workEmail!.toLowerCase(),
      companyTeamOrProject: companyTeamOrProject!,
      role: role!,
      postgresqlVersions: postgresqlVersions!,
      windowsVersion: windowsVersion!,
      otherDatabaseEngines,
      gitWorkflow,
      schemaChangeProcess: schemaChangeProcess!,
      referenceDataProcess: referenceDataProcess!,
      databaseReviewers: databaseReviewers!,
      releaseSqlProcess: releaseSqlProcess!,
      difficultChange: difficultChange!,
      firstWorkflow: firstWorkflow!,
      importantObjectTypes: importantObjectTypes!,
      managesReferenceDataInGit: managesReferenceDataInGit!,
      evaluationGoals: evaluationGoals!,
      processingConsent: true,
      futureUpdatesOptIn,
    },
  };
}
