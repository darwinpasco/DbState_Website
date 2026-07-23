import {
  MAX_REQUEST_BODY_BYTES,
  SUCCESS_RESPONSE_STATUS,
} from "./application-contract";
import {
  DuplicateApplicationError,
  PersistenceError,
  type D1DatabaseLike,
} from "./application-repository";
import { persistApplication } from "./application-repository";
import { validateApplicationRequest } from "./application-validation";
import { errorResponse, jsonResponse } from "./http-responses";

export interface AssetFetcherLike {
  fetch(request: Request): Response | Promise<Response>;
}

export interface WorkerEnv {
  ASSETS: AssetFetcherLike;
  PRIVATE_BETA_INTAKE_MODE?: string;
  PRIVATE_BETA_DB?: D1DatabaseLike;
}

function isJsonContentType(contentType: string | null) {
  return contentType?.toLowerCase().split(";")[0].trim() === "application/json";
}

function isOriginAllowed(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  return origin === new URL(request.url).origin;
}

async function readJsonRequestBody(request: Request) {
  const contentLength = request.headers.get("content-length");

  if (contentLength !== null) {
    const parsedLength = Number.parseInt(contentLength, 10);
    if (
      Number.isFinite(parsedLength) &&
      parsedLength > MAX_REQUEST_BODY_BYTES
    ) {
      return {
        ok: false as const,
        response: errorResponse(
          413,
          "payload_too_large",
          "Request body must not exceed 32 KiB.",
        ),
      };
    }
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_REQUEST_BODY_BYTES) {
    return {
      ok: false as const,
      response: errorResponse(
        413,
        "payload_too_large",
        "Request body must not exceed 32 KiB.",
      ),
    };
  }

  try {
    return {
      ok: true as const,
      value: JSON.parse(new TextDecoder().decode(body)) as unknown,
    };
  } catch {
    return {
      ok: false as const,
      response: errorResponse(
        400,
        "malformed_json",
        "Request body must be valid JSON.",
      ),
    };
  }
}

export async function handlePrivateBetaApplication(
  request: Request,
  env: WorkerEnv,
) {
  if (request.method !== "POST") {
    const response = errorResponse(
      405,
      "method_not_allowed",
      "Only POST is supported for this endpoint.",
      undefined,
    );
    response.headers.set("allow", "POST");
    return response;
  }

  const intakeMode = env.PRIVATE_BETA_INTAKE_MODE;

  if (intakeMode === "disabled") {
    return errorResponse(
      503,
      "intake_disabled",
      "Private Beta application intake is not currently enabled.",
    );
  }

  if (intakeMode !== "test") {
    return errorResponse(
      503,
      "intake_not_configured",
      "Private Beta application intake is not configured.",
    );
  }

  if (!isOriginAllowed(request)) {
    return errorResponse(
      403,
      "origin_not_allowed",
      "Requests from this origin are not allowed.",
    );
  }

  if (!isJsonContentType(request.headers.get("content-type"))) {
    return errorResponse(
      415,
      "unsupported_media_type",
      "Request content type must be application/json.",
    );
  }

  const parsedBody = await readJsonRequestBody(request);
  if (parsedBody.ok === false) {
    return parsedBody.response;
  }

  const validation = validateApplicationRequest(parsedBody.value);
  if (validation.ok === false) {
    return errorResponse(
      422,
      "validation_failed",
      "Application request validation failed.",
      validation.fields,
    );
  }

  if (!env.PRIVATE_BETA_DB) {
    return errorResponse(
      503,
      "intake_not_configured",
      "Private Beta application intake is not configured.",
    );
  }

  try {
    const persisted = await persistApplication(
      env.PRIVATE_BETA_DB,
      validation.value,
    );

    return jsonResponse(
      {
        applicationReference: persisted.applicationReference,
        status: SUCCESS_RESPONSE_STATUS,
        submittedAt: persisted.submittedAt,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DuplicateApplicationError) {
      return errorResponse(
        409,
        "duplicate_application",
        "An application from this email address was already received recently.",
      );
    }

    if (error instanceof PersistenceError) {
      return errorResponse(
        500,
        "persistence_failed",
        "Private Beta application could not be saved.",
      );
    }

    return errorResponse(
      500,
      "persistence_failed",
      "Private Beta application could not be saved.",
    );
  }
}
