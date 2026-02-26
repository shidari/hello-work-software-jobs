import type { AppType } from "@sho/job-store-api/types";
import type { Job, Unbrand } from "@sho/models";
import { hc } from "hono/client";

function createClient() {
  const endpoint = process.env.JOB_STORE_ENDPOINT;
  if (!endpoint) throw new Error("JOB_STORE_ENDPOINT is not defined");
  return hc<AppType>(endpoint);
}

export const jobStoreClient = createClient();

export type JobList = Unbrand<Job>[];

export type SearchFilter = {
  companyName?: string;
  employeeCountLt?: string;
  employeeCountGt?: string;
  jobDescription?: string;
  jobDescriptionExclude?: string;
  onlyNotExpired?: boolean;
  orderByReceiveDate?: "asc" | "desc";
  addedSince?: string;
  addedUntil?: string;
};
