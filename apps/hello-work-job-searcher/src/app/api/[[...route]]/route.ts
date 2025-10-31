import { Hono } from "hono";
import { handle } from "hono/vercel";
import { jobStoreClientOnServer } from "@/app/_store/server";
const app = new Hono().basePath("/api");

const jobsApp = new Hono().get("/", async (c) => {
  try {
    const queries = c.req.queries();
    console.log("Received queries:", JSON.stringify(queries, null, 2));
    const companyName = c.req.query("companyName");
    const employeeCountGt = c.req.query("employeeCountGt");
    const employeeCountLt = c.req.query("employeeCountLt");
    const jobDescription = c.req.query("jobDescription");
    const jobDescriptionExclude = c.req.query("jobDescriptionExclude");
    const addedSince = c.req.query("addedSince");
    const addedUntil = c.req.query("addedUntil");

    const filter = {
      ...(companyName ? { companyName } : {}),
      ...(jobDescription ? { jobDescription } : {}),
      ...(jobDescriptionExclude ? { jobDescriptionExclude } : {}),
      ...(employeeCountGt ? { employeeCountGt } : {}),
      ...(employeeCountLt ? { employeeCountLt } : {}),
      ...(addedSince ? { addedSince } : {}),
      ...(addedUntil ? { addedUntil } : {}),
      onlyNotExpired: true,
      orderByReceiveDate: "desc" as const,
    };

    const result = await jobStoreClientOnServer.getInitialJobs(filter);

    return result.match(
      (validatedData) => {
        return c.json({ ...validatedData, success: true });
      },
      (error) => {
        console.error("Error fetching job data:", error);
        return c.json(
          { message: "internal server error", success: false },
          { status: 500 },
        );
      },
    );
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
    const result = await jobStoreClientOnServer.getJob(jobNumber);
    return result.match(
      (validatedData) => {
        return c.json({ ...validatedData, success: true });
      },
      (error) => {
        console.error("Error fetching job data:", error);
        return c.json(
          { message: "internal server error", success: false },
          { status: 500 },
        );
      },
    );
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
    const result = await jobStoreClientOnServer.getContinuedJobs(nextToken);

    return result.match(
      (validatedData) => {
        return c.json({ ...validatedData, success: true });
      },
      (error) => {
        console.error("Error fetching job data:", error);
        return c.json(
          { message: "internal server error", success: false },
          { status: 500 },
        );
      },
    );
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
