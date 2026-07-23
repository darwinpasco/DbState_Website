import {
  TURNSTILE_EXPECTED_ACTION,
  TURNSTILE_SITEVERIFY_URL,
  TURNSTILE_TIMEOUT_MS,
} from "./application-contract";

export type TurnstileErrorCode =
  | "turnstile_invalid"
  | "turnstile_action_mismatch"
  | "turnstile_hostname_mismatch"
  | "turnstile_not_configured"
  | "turnstile_unavailable";

export interface TurnstileValidationSuccess {
  ok: true;
}

export interface TurnstileValidationFailure {
  ok: false;
  status: 422 | 503;
  code: TurnstileErrorCode;
  message: string;
}

export type TurnstileValidationResult =
  TurnstileValidationSuccess | TurnstileValidationFailure;

export type SiteverifyFetch = typeof fetch;

export interface TurnstileEnv {
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_EXPECTED_ACTION?: string;
  TURNSTILE_EXPECTED_HOSTNAMES?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SITEVERIFY_FETCH?: SiteverifyFetch;
  TURNSTILE_SITEVERIFY_TIMEOUT_MS?: string;
}

interface SiteverifyResponse {
  success: boolean;
  hostname?: string;
  action?: string;
  challenge_ts?: string;
  cdata?: string;
  "error-codes"?: string[];
}

const invalidMessage =
  "The verification could not be confirmed. Refresh the verification and try again.";

function turnstileInvalid(
  code: TurnstileErrorCode = "turnstile_invalid",
): TurnstileValidationFailure {
  return {
    ok: false,
    status: 422,
    code,
    message: invalidMessage,
  };
}

function parseExpectedHostnames(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
}

function parseTimeoutMs(value: string | undefined) {
  if (!value) {
    return TURNSTILE_TIMEOUT_MS;
  }

  const timeout = Number.parseInt(value, 10);
  return Number.isFinite(timeout) && timeout > 0
    ? timeout
    : TURNSTILE_TIMEOUT_MS;
}

function isSiteverifyResponse(value: unknown): value is SiteverifyResponse {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const response = value as Record<string, unknown>;

  if (typeof response.success !== "boolean") {
    return false;
  }

  if (
    response.hostname !== undefined &&
    typeof response.hostname !== "string"
  ) {
    return false;
  }

  if (response.action !== undefined && typeof response.action !== "string") {
    return false;
  }

  if (
    response["error-codes"] !== undefined &&
    (!Array.isArray(response["error-codes"]) ||
      !response["error-codes"].every((code) => typeof code === "string"))
  ) {
    return false;
  }

  return true;
}

async function fetchWithTimeout(
  siteverifyFetch: SiteverifyFetch,
  request: Request,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await siteverifyFetch(request, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function validateTurnstileToken(
  token: string,
  env: TurnstileEnv,
  idempotencyKey = crypto.randomUUID(),
): Promise<TurnstileValidationResult> {
  const secret = env.TURNSTILE_SECRET_KEY;
  const expectedAction = env.TURNSTILE_EXPECTED_ACTION;
  const expectedHostnames = parseExpectedHostnames(
    env.TURNSTILE_EXPECTED_HOSTNAMES,
  );

  if (
    !secret ||
    !expectedAction ||
    expectedAction !== TURNSTILE_EXPECTED_ACTION ||
    expectedHostnames.length === 0
  ) {
    return {
      ok: false,
      status: 503,
      code: "turnstile_not_configured",
      message: "Application verification is not currently configured.",
    };
  }

  const siteverifyFetch = env.TURNSTILE_SITEVERIFY_FETCH ?? fetch;
  const timeoutMs = parseTimeoutMs(env.TURNSTILE_SITEVERIFY_TIMEOUT_MS);

  const request = new Request(TURNSTILE_SITEVERIFY_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      secret,
      response: token,
      idempotency_key: idempotencyKey,
    }),
  });

  let response: Response;
  try {
    response = await fetchWithTimeout(siteverifyFetch, request, timeoutMs);
  } catch {
    return {
      ok: false,
      status: 503,
      code: "turnstile_unavailable",
      message:
        "Application verification is temporarily unavailable. Try again later.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: 503,
      code: "turnstile_unavailable",
      message:
        "Application verification is temporarily unavailable. Try again later.",
    };
  }

  let siteverifyBody: unknown;
  try {
    siteverifyBody = await response.json();
  } catch {
    return turnstileInvalid();
  }

  if (!isSiteverifyResponse(siteverifyBody)) {
    return turnstileInvalid();
  }

  if (siteverifyBody.success !== true) {
    return turnstileInvalid();
  }

  if (siteverifyBody.action !== expectedAction) {
    return turnstileInvalid("turnstile_action_mismatch");
  }

  if (
    !siteverifyBody.hostname ||
    !expectedHostnames.includes(siteverifyBody.hostname.toLowerCase())
  ) {
    return turnstileInvalid("turnstile_hostname_mismatch");
  }

  return {
    ok: true,
  };
}
