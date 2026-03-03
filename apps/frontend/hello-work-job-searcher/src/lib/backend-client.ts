import type { AppType as BackendAppType } from "@sho/job-store-api/types";
import { hc } from "hono/client";

export type AppType = BackendAppType;

export const jobStoreClient = (() => {
  const endpoint = process.env.JOB_STORE_ENDPOINT;
  if (!endpoint) throw new Error("JOB_STORE_ENDPOINT is not defined");
  return hc<BackendAppType>(endpoint);
})();
