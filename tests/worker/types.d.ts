/// <reference types="@cloudflare/vitest-pool-workers/types" />

import type {
  AssetFetcherLike,
  WorkerEnv,
} from "../../worker/private-beta/application-handler";
import type { D1DatabaseLike } from "../../worker/private-beta/application-repository";

interface D1Migration {
  name: string;
  queries: string[];
}

declare global {
  namespace Cloudflare {
    interface Env extends WorkerEnv {
      ASSETS: AssetFetcherLike;
      PRIVATE_BETA_INTAKE_MODE: string;
      PRIVATE_BETA_DB: D1DatabaseLike;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
