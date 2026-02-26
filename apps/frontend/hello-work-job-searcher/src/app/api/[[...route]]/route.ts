import type { AppType as BackendAppType } from "@sho/job-store-api/types";
import { Hono } from "hono";
import { hc } from "hono/client";
import { handle } from "hono/vercel";

function createBackendClient() {
  const endpoint = process.env.JOB_STORE_ENDPOINT;
  if (!endpoint) throw new Error("JOB_STORE_ENDPOINT is not defined");
  return hc<BackendAppType>(endpoint);
}

export const jobStoreClient = createBackendClient();

const app = new Hono().basePath("/api");

const jobsApp = new Hono().get("/", async (c) => {
  try {
    const companyName = c.req.query("companyName");
    const employeeCountGt = c.req.query("employeeCountGt");
    const employeeCountLt = c.req.query("employeeCountLt");
    const jobDescription = c.req.query("jobDescription");
    const jobDescriptionExclude = c.req.query("jobDescriptionExclude");
    const addedSince = c.req.query("addedSince");
    const addedUntil = c.req.query("addedUntil");

    const query = {
      ...(companyName ? { companyName } : {}),
      ...(jobDescription ? { jobDescription } : {}),
      ...(jobDescriptionExclude ? { jobDescriptionExclude } : {}),
      ...(employeeCountGt ? { employeeCountGt } : {}),
      ...(employeeCountLt ? { employeeCountLt } : {}),
      ...(addedSince ? { addedSince } : {}),
      ...(addedUntil ? { addedUntil } : {}),
      onlyNotExpired: "true",
      orderByReceiveDate: "desc" as const,
    };

    const res = await jobStoreClient.api.v1.jobs.$get({ query });
    const data = await res.json();
    return c.json({ ...data, success: true });
  } catch (error) {
    console.error("Error fetching job data:", error);
    return c.json({ message: "internal server error", success: false }, 500);
  }
});

const jobApp = new Hono().get("/:jobNumber", async (c) => {
  try {
    const { jobNumber } = c.req.param();
    if (!jobNumber) {
      return c.json(
        { message: "Missing jobNumber", success: false },
        { status: 400 },
      );
    }
    const res = await jobStoreClient.api.v1.jobs[":jobNumber"].$get({
      param: { jobNumber },
    });
    const data = await res.json();
    if (!data) {
      return c.json({ message: "Job not found", success: false as const }, 404);
    }
    return c.json({ ...data, success: true as const });
  } catch (error) {
    console.error("Error fetching job data:", error);
    return c.json({ message: "internal server error", success: false }, 500);
  }
});

const jobsContinueApp = new Hono().get("/", async (c) => {
  try {
    const nextToken = c.req.query("nextToken");
    if (!nextToken) {
      return c.json(
        { message: "Missing nextToken", success: false },
        { status: 400 },
      );
    }
    const res = await jobStoreClient.api.v1.jobs.continue.$get({
      query: { nextToken },
    });
    const data = await res.json();
    return c.json({ ...data, success: true });
  } catch (error) {
    console.error("Error fetching job data:", error);
    return c.json({ message: "internal server error", success: false }, 500);
  }
});

const routes = app
  .route("/jobs", jobsApp)
  .route("/jobs/continue", jobsContinueApp)
  .route("/jobs", jobApp);

export type AppType = typeof routes;

export const GET = handle(app);
export const POST = handle(app);
