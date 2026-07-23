import { APPLICATION_ENDPOINT } from "./private-beta/application-contract";
import {
  handlePrivateBetaApplication,
  type ExecutionContextLike,
  type WorkerEnv,
} from "./private-beta/application-handler";
import { errorResponse } from "./private-beta/http-responses";

export default {
  async fetch(
    request: Request,
    env: WorkerEnv,
    ctx?: ExecutionContextLike,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === APPLICATION_ENDPOINT) {
      return handlePrivateBetaApplication(request, env, ctx);
    }

    if (url.pathname.startsWith("/api/")) {
      return errorResponse(
        404,
        "not_found",
        "The requested API endpoint was not found.",
      );
    }

    return env.ASSETS.fetch(request);
  },
};
