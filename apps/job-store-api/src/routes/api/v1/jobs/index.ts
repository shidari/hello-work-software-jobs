import { vValidator } from "@hono/valibot-validator";
import {
  type DecodedNextToken,
  jobFetchClientErrorResponseSchema,
  jobFetchParamSchema,
  jobFetchServerErrorSchema,
  jobFetchSuccessResponseSchema,
  jobListClientErrorResponseSchema,
  jobListQuerySchema,
  jobListServerErrorSchema,
  jobListSuccessResponseSchema,
} from "@sho/models";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { sign } from "hono/jwt";
import { describeRoute, resolver } from "hono-openapi";
import { err, ok, okAsync, ResultAsync, safeTry } from "neverthrow";
import * as v from "valibot";
import { safeParse } from "valibot";
import { createJobStoreResultBuilder } from "../../../../clientImpl";
import { createJobStoreDBClientAdapter } from "../../../../clientImpl/adapter";
import {
  createEmployeeCountGtValidationError,
  createEmployeeCountLtValidationError,
  createEnvError,
  createJWTSignatureError,
} from "../../../error";
import { envSchema } from "../../../util";
// continueが予約後っぽいので
import continueRoute from "./continue";

const INITIAL_JOB_ID = 1; // 初期のcursorとして使用するjobId

const jobListRoute = describeRoute({
  responses: {
    "200": {
      description: "Successful response",
      content: {
        "application/json": {
          schema: resolver(jobListSuccessResponseSchema),
        },
      },
    },
    "400": {
      description: "client error response",
      content: {
        "application/json": {
          schema: resolver(jobListClientErrorResponseSchema),
        },
      },
    },
    "500": {
      description: "internal server error response",
      content: {
        "application/json": {
          schema: resolver(jobListServerErrorSchema),
        },
      },
    },
  },
});

const jobFetchRoute = describeRoute({
  responses: {
    "200": {
      description: "Successful response",
      content: {
        "application/json": {
          schema: resolver(jobFetchSuccessResponseSchema),
        },
      },
    },
    "400": {
      description: "client error response",
      content: {
        "application/json": {
          schema: resolver(jobFetchClientErrorResponseSchema),
        },
      },
    },
    "500": {
      description: "internal server error response",
      content: {
        "application/json": {
          schema: resolver(jobFetchServerErrorSchema),
        },
      },
    },
  },
});

const app = new Hono<{ Bindings: Env }>();

app.get("/", jobListRoute, vValidator("query", jobListQuerySchema), (c) => {
  const {
    companyName: encodedCompanyName,
    employeeCountGt: rawEmployeeCountGt,
    employeeCountLt: rawEmployeeCountLt,
    jobDescription: encodedJobDescription,
    jobDescriptionExclude: encodedJobDescriptionExclude,
    onlyNotExpired,
    orderByReceiveDate,
  } = c.req.valid("query");
  const companyName = encodedCompanyName
    ? decodeURIComponent(encodedCompanyName)
    : undefined;
  const jobDescription = encodedJobDescription
    ? decodeURIComponent(encodedJobDescription)
    : undefined;

  const jobDescriptionExclude = encodedJobDescriptionExclude
    ? decodeURIComponent(encodedJobDescriptionExclude)
    : undefined;

  const db = drizzle(c.env.DB);
  const dbClient = createJobStoreDBClientAdapter(db);
  const jobStore = createJobStoreResultBuilder(dbClient);

  const limit = 20;

  const result = safeTry(async function* () {
    const employeeCountGt = yield* (() => {
      if (rawEmployeeCountGt === undefined) return ok(undefined);
      const result = safeParse(
        v.pipe(v.number(), v.integer(), v.minValue(0)),
        Number(rawEmployeeCountGt),
      );
      if (!result.success)
        return err(
          createEmployeeCountGtValidationError(
            `Invalid employeeCountGt.${result.issues.map((issue) => issue.message).join("\n")}`,
          ),
        );
      return ok(result.output);
    })();
    const employeeCountLt = yield* (() => {
      if (rawEmployeeCountLt === undefined) return ok(undefined);
      const result = safeParse(
        v.pipe(v.number(), v.integer(), v.minValue(0)),
        Number(rawEmployeeCountLt),
      );
      if (!result.success)
        return err(
          createEmployeeCountLtValidationError(
            `Invalid employeeCountLt.${result.issues.map((issue) => issue.message).join("\n")}`,
          ),
        );
      return ok(result.output);
    })();
    const { JWT_SECRET: jwtSecret } = yield* (() => {
      const result = v.safeParse(envSchema, c.env);
      if (!result.success)
        return err(
          createEnvError(
            `Environment variable validation failed: ${String(result.issues)}`,
          ),
        );
      return ok(result.output);
    })();
    const jobListResult = yield* await jobStore.fetchJobList({
      cursor: {
        jobId: INITIAL_JOB_ID,
        receivedDateByISOString:
          orderByReceiveDate === "desc"
            ? "9999-12-31T23:59:59.999Z"
            : "0000-01-01T00:00:00.000Z",
      },
      limit,
      filter: {
        companyName,
        employeeCountGt,
        employeeCountLt,
        jobDescription,
        jobDescriptionExclude,
        onlyNotExpired,
        orderByReceiveDate,
      },
    });

    const {
      jobs,
      cursor: { jobId, receivedDateByISOString },
      meta,
    } = jobListResult;

    const { count: restJobCount } = yield* await jobStore.countJobs({
      cursor: { jobId, receivedDateByISOString },
      filter: meta.filter,
    });

    const nextToken = yield* (() => {
      if (restJobCount <= limit) return okAsync(undefined);
      const validPayload: DecodedNextToken = {
        exp: Math.floor(Date.now() / 1000) + 60 * 15, // 15分後の有効期限
        cursor: { jobId, receivedDateByISOString },
        filter: meta.filter,
      };
      const signResult = ResultAsync.fromPromise(
        sign(validPayload, jwtSecret),
        (error) =>
          createJWTSignatureError(`JWT signing failed.\n${String(error)}`),
      );
      return signResult;
    })();

    return okAsync({ jobs, nextToken, meta });
  });
  return result.match(
    ({ jobs, nextToken, meta }) => c.json({ jobs, nextToken, meta }),
    (error) => {
      console.error(error);
      switch (error._tag) {
        case "JWTSignatureError":
        case "EnvError":
          throw new HTTPException(500, { message: "internal server error" });
        case "EmployeeCountGtValidationError":
        case "EmployeeCountLtValidationError":
          throw new HTTPException(400, {
            message: `Invalid employee count Gt: ${rawEmployeeCountGt}, Lt: ${rawEmployeeCountLt}`,
          });
        default:
          throw new HTTPException(500, { message: "internal server error" });
      }
    },
  );
});

app.route("/continue", continueRoute);

app.get(
  "/:jobNumber",
  jobFetchRoute,
  vValidator("param", jobFetchParamSchema),
  (c) => {
    const { jobNumber } = c.req.valid("param");
    const db = drizzle(c.env.DB);
    const dbClient = createJobStoreDBClientAdapter(db);
    const jobStore = createJobStoreResultBuilder(dbClient);

    const result = safeTry(async function* () {
      const job = yield* await jobStore.fetchJob(jobNumber);
      return okAsync(job);
    });
    return result.match(
      (job) => c.json(job),
      (error) => {
        console.error(error);

        switch (error._tag) {
          case "FetchJobError":
            throw new HTTPException(404, { message: "Job not found" });
          default:
            throw new HTTPException(500, { message: "internal server error" });
        }
      },
    );
  },
);
export default app;
