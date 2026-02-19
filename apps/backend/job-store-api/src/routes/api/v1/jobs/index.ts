import { Job, JobNumber } from "@sho/models";
import { drizzle } from "drizzle-orm/d1";
import { Either, Schema } from "effect";
import { TreeFormatter } from "effect/ParseResult";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { sign } from "hono/jwt";
import { validator as effectValidator } from "hono-openapi";
import { err, ok, okAsync, ResultAsync, safeTry } from "neverthrow";
import { createJobStoreDBClientAdapter } from "../../../../adapters";
import {
  createFetchJobError,
  createFetchJobListError,
  createInsertJobDuplicationError,
  createInsertJobError,
  createJobsCountError,
} from "../../../../adapters/error";
import { PAGE_SIZE } from "../../../../common";
import {
  createEmployeeCountGtValidationError,
  createEmployeeCountLtValidationError,
  createEnvError,
  createJWTSignatureError,
} from "../../../error";
import { envSchema } from "../../../util";
// continueが予約後っぽいので
import continueRoute, { type DecodedNextToken } from "./continue";
import { createUnexpectedError } from "./error";
import { jobFetchRoute, jobInsertRoute, jobListRoute } from "./routingSchema";
import { searchFilterSchema } from "./searchFilter";

const jobFetchParamSchema = Schema.Struct({
  jobNumber: JobNumber,
});

const jobListQuerySchema = Schema.Struct({
  ...searchFilterSchema.fields,
  employeeCountLt: Schema.optional(Schema.String),
  employeeCountGt: Schema.optional(Schema.String),
});

const insertJobRequestBodySchema = Job;

const employeeCountSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);

const app = new Hono<{ Bindings: Env }>();

app.get(
  "/",
  jobListRoute,
  effectValidator("query", Schema.standardSchemaV1(jobListQuerySchema)),
  (c) => {
    const {
      companyName: encodedCompanyName,
      employeeCountGt: rawEmployeeCountGt,
      employeeCountLt: rawEmployeeCountLt,
      jobDescription: encodedJobDescription,
      jobDescriptionExclude: encodedJobDescriptionExclude,
      onlyNotExpired,
      orderByReceiveDate,
      addedSince,
      addedUntil,
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

    const result = safeTry(async function* () {
      const employeeCountGt = yield* (() => {
        if (rawEmployeeCountGt === undefined) return ok(undefined);
        const result = Schema.decodeUnknownEither(employeeCountSchema)(
          Number(rawEmployeeCountGt),
        );
        if (Either.isLeft(result))
          return err(
            createEmployeeCountGtValidationError(
              `Invalid employeeCountGt. received: ${JSON.stringify(rawEmployeeCountGt)}\n${TreeFormatter.formatErrorSync(result.left)}`,
            ),
          );
        return ok(result.right);
      })();
      const employeeCountLt = yield* (() => {
        if (rawEmployeeCountLt === undefined) return ok(undefined);
        const result = Schema.decodeUnknownEither(employeeCountSchema)(
          Number(rawEmployeeCountLt),
        );
        if (Either.isLeft(result))
          return err(
            createEmployeeCountLtValidationError(
              `Invalid employeeCountLt. received: ${JSON.stringify(rawEmployeeCountLt)}\n${TreeFormatter.formatErrorSync(result.left)}`,
            ),
          );
        return ok(result.right);
      })();
      const { JWT_SECRET: jwtSecret } = yield* (() => {
        const result = Schema.decodeUnknownEither(envSchema)(c.env);
        if (Either.isLeft(result))
          return err(
            createEnvError(
              `Environment variable validation failed. received: ${JSON.stringify(c.env)}\n${TreeFormatter.formatErrorSync(result.left)}`,
            ),
          );
        return ok(result.right);
      })();
      const jobListResult = yield* await ResultAsync.fromSafePromise(
        dbClient.execute({
          type: "FetchJobsPage",
          options: {
            page: 1,
            filter: {
              companyName,
              employeeCountGt,
              employeeCountLt,
              jobDescription,
              jobDescriptionExclude,
              onlyNotExpired,
              orderByReceiveDate,
              addedSince,
              addedUntil,
            },
          },
        }),
      );
      if (!jobListResult.success) {
        return err(createFetchJobListError("Failed to fetch job list"));
      }
      const { jobs, meta } = jobListResult;

      const restJobCountResult = yield* ResultAsync.fromSafePromise(
        dbClient.execute({
          type: "CountJobs",
          options: {
            page: 1,
            filter: meta.filter,
          },
        }),
      );
      if (!restJobCountResult.success) {
        return err(createJobsCountError("Failed to count jobs"));
      }

      const { count: restJobCount } = restJobCountResult;

      const nextToken = yield* (() => {
        if (restJobCount <= PAGE_SIZE) return okAsync(undefined);
        const validPayload: DecodedNextToken = {
          exp: Math.floor(Date.now() / 1000) + 60 * 15, // 15分後の有効期限
          iss: "sho-hello-work-job-searcher",
          iat: Math.floor(Date.now() / 1000),
          nbf: Math.floor(Date.now() / 1000),
          page: 1,
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
  },
);

app.post(
  "/",
  jobInsertRoute,
  // APIキー認証ミドルウェア
  (c, next) => {
    const apiKey = c.req.header("x-api-key");
    const validApiKey = c.env.API_KEY;
    if (!apiKey || apiKey !== validApiKey) {
      return c.json({ message: "Invalid API key" }, 401);
    }
    return next();
  },
  effectValidator(
    "json",
    Schema.standardSchemaV1(insertJobRequestBodySchema),
    (result, c) => {
      if (!result.success) {
        const detail = result.error.map((issue) => issue.message).join("\n");
        console.log(`Invalid request body. detail: ${detail}`);
        return c.json(
          { message: `Invalid request body. detail: ${detail}` },
          400,
        );
      }
    },
  ),
  async (c) => {
    console.log("in job insert route");
    // throw new Error("test error");
    const body = c.req.valid("json");
    const db = drizzle(c.env.DB);
    const dbClient = createJobStoreDBClientAdapter(db);
    const result = await safeTry(async function* () {
      const duplicateResult = yield* await ResultAsync.fromSafePromise(
        dbClient.execute({
          type: "FindJobByNumber",
          jobNumber: body.jobNumber,
        }),
      );
      if (!duplicateResult.success) {
        return err(createUnexpectedError("Failed to check duplication"));
      }
      console.log(JSON.stringify(duplicateResult, null, 2));
      if (duplicateResult.job !== null) {
        return err(
          createInsertJobDuplicationError(
            "Job with the same jobNumber already exists",
          ),
        );
      }
      const jobResult = yield* ResultAsync.fromSafePromise(
        dbClient.execute({
          type: "InsertJob",
          payload: body,
        }),
      );
      if (!jobResult.success) {
        return err(createInsertJobError("Failed to insert job"));
      }
      const job = jobResult;
      return okAsync(job);
    });
    return result.match(
      (job) => c.json(job),
      (error) => {
        console.error(error);
        switch (error._tag) {
          case "InsertJobError":
            return c.json({ message: error.message }, 500);
          case "InsertJobDuplicationError":
            return c.json({ message: error.message }, 409);
          case "UnexpectedError":
            return c.json({ message: error.message }, 500);
          default: {
            const _exhaustiveCheck: never = error;
            return c.json({ message: "Unknown error occurred" }, 500);
          }
        }
      },
    );
  },
);

app.route("/continue", continueRoute);

app.get(
  "/:jobNumber",
  jobFetchRoute,
  effectValidator("param", Schema.standardSchemaV1(jobFetchParamSchema)),
  (c) => {
    const { jobNumber } = c.req.valid("param");
    const db = drizzle(c.env.DB);
    const dbClient = createJobStoreDBClientAdapter(db);
    const result = safeTry(async function* () {
      const jobResult = yield* await ResultAsync.fromSafePromise(
        dbClient.execute({
          type: "FindJobByNumber",
          jobNumber,
        }),
      );
      if (!jobResult.success) {
        return err(createFetchJobError("Failed to fetch job"));
      }
      const job = jobResult.job;
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
