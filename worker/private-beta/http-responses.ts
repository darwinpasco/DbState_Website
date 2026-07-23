export interface ErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...init.headers,
    },
  });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
) {
  const body: ErrorBody = {
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
    },
  };

  return jsonResponse(body, { status });
}
