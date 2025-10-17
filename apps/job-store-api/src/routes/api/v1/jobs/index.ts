import { vValidator } from "@hono/valibot-validator";
import {
  type DecodedNextToken,
  insertJobGeneralClientErrorResponseSchema,
  insertJobDuplicationErrorResponseSchema,
  insertJobRequestBodySchema,
  insertJobServerErrorResponseSchema,
  insertJobSuccessResponseSchema,
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
import {
  createEmployeeCountGtValidationError,
  createEmployeeCountLtValidationError,
  createEnvError,
  createJWTSignatureError,
} from "../../../error";
import { envSchema } from "../../../util";
// continueが予約後っぽいので
import continueRoute from "./continue";
import { createJobStoreDBClientAdapter } from "../../../../adapters";
import {
  createFetchJobError,
  createFetchJobListError,
  createInsertJobDuplicationError,
  createInsertJobError,
  createJobsCountError,
} from "../../../../adapters/error";
import { createUnexpectedError } from "./error";

const INITIAL_JOB_ID = 1; // 初期のcursorとして使用するjobId

const jobListRoute = describeRoute({
  parameters: [
    {
      name: "companyName",
      in: "query",
      required: false,
    },
    {
      name: "employeeCountGt",
      in: "query",
      required: false,
    },
    {
      name: "employeeCountLt",
      in: "query",
      required: false,
    },
    {
      name: "jobDescription",
      in: "query",
      required: false,
    },
    {
      name: "jobDescriptionExclude",
      in: "query",
      required: false,
    },
    {
      name: "onlyNotExpired",
      in: "query",
      required: false,
    },
    {
      name: "orderByReceiveDate",
      in: "query",
      required: false,
      example: "desc"
    },
    {
      name: "addedSince",
      in: "query",
      description: "追加された日時（ISO形式）",
      example: "2025-10-17",
      required: false
    },
    {
      name: "addedUntil",
      in: "query",
      description: "追加された日時（ISO形式）",
      example: "2025-10-17",
      required: false
    },
    {
      name: "addedUntil",
      in: "query",
      description: "追加された日時（ISO形式）",
      example: "2025-10-17",
      required: false
    }
  ],
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

const jobInsertRoute = describeRoute({
  security: [{ ApiKeyAuth: [] }],
  requestBody: {
    description: "Job insert request body",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            wageMin: {
              type: "number",
              description: "最低賃金",
            },
            wageMax: {
              type: "number",
              description: "最高賃金",
            },
            workingStartTime: {
              type: "string",
              description: "勤務開始時間",
            },
            workingEndTime: {
              type: "string",
              description: "勤務終了時間",
            },
            receivedDate: {
              type: "string",
              pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$",
              description: "受信日時（ISO形式）",
            },
            expiryDate: {
              type: "string",
              pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$",
              description: "有効期限（ISO形式）",
            },
            employeeCount: {
              type: "number",
              description: "従業員数",
            },
            jobNumber: {
              type: "string",
              pattern: "^[0-9]+$",
              description: "求人番号",
            },
            companyName: {
              type: "string",
              description: "会社名",
            },
            homePage: {
              type: "string",
              description: "ホームページURL（任意）",
            },
            occupation: {
              type: "string",
              minLength: 1,
              description: "職業",
            },
            employmentType: {
              type: "string",
              description: "雇用形態",
            },
            workPlace: {
              type: "string",
              description: "勤務地",
            },
            jobDescription: {
              type: "string",
              description: "求人内容・仕事内容",
            },
            qualifications: {
              type: "string",
              description: "必要な資格・経験（任意）",
            },
          },
          required: [
            "wageMin",
            "wageMax",
            "workingStartTime",
            "workingEndTime",
            "receivedDate",
            "expiryDate",
            "employeeCount",
            "jobNumber",
            "companyName",
            "occupation",
            "employmentType",
            "workPlace",
            "jobDescription",
          ],
        },
      },
    },
  },
  responses: {
    "200": {
      description: "Successful response",
      content: {
        "application/json": {
          schema: resolver(insertJobSuccessResponseSchema),
        },
      },
    },
    "409": {
      description: "duplication error response",
      content: {
        "application/json": {
          schema: resolver(insertJobDuplicationErrorResponseSchema),
        },
      },
    },
    "400": {
      description: "client error response",
      content: {
        "application/json": {
          schema: resolver(insertJobGeneralClientErrorResponseSchema),
        },
      },
    },
    "500": {
      description: "internal server error response",
      content: {
        "application/json": {
          schema: resolver(insertJobServerErrorResponseSchema),
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
            `Invalid employeeCountGt. received: ${JSON.stringify(rawEmployeeCountGt)}\n${result.issues.map((issue) => issue.message).join("\n")}`,
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
            `Invalid employeeCountLt. received: ${JSON.stringify(rawEmployeeCountLt)}\n${result.issues.map((issue) => issue.message).join("\n")}`,
          ),
        );
      return ok(result.output);
    })();
    const { JWT_SECRET: jwtSecret } = yield* (() => {
      const result = v.safeParse(envSchema, c.env);
      if (!result.success)
        return err(
          createEnvError(
            `Environment variable validation failed. received: ${JSON.stringify(c.env)}\n${String(result.issues)}`,
          ),
        );
      return ok(result.output);
    })();
    const jobListResult = yield* await ResultAsync.fromSafePromise(
      dbClient.execute({
        type: "FindJobs",
        options: {
          cursor: {
            jobId: INITIAL_JOB_ID,
            receivedDateByISOString: new Date(0).toISOString(),
          }, // 初回は最初から取得
          limit,
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
    const {
      jobs,
      cursor: { jobId, receivedDateByISOString },
      meta,
    } = jobListResult;

    const restJobCountResult = yield* ResultAsync.fromSafePromise(
      dbClient.execute({
        type: "CountJobs",
        options: {
          cursor: { jobId, receivedDateByISOString },
          filter: meta.filter,
        },
      }),
    );
    if (!restJobCountResult.success) {
      return err(createJobsCountError("Failed to count jobs"));
    }

    const { count: restJobCount } = restJobCountResult;

    const nextToken = yield* (() => {
      if (restJobCount <= limit) return okAsync(undefined);
      const validPayload: DecodedNextToken = {
        exp: Math.floor(Date.now() / 1000) + 60 * 15, // 15分後の有効期限
        iss: "sho-hello-work-job-searcher",
        iat: Date.now(),
        nbf: Date.now(),
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
  vValidator("json", insertJobRequestBodySchema, (result, c) => {
    if (!result.success) {
      console.log(
        `Invalid request body. detail: ${result.issues.map((issue) => `expected: ${issue.expected}, received: ${issue.received}, message: ${issue.message}`).join("\n")}`,
      );
      return c.json(
        {
          message: `Invalid request body. detail: ${result.issues.map((issue) => `expected: ${issue.expected}, received: ${issue.received}, message: ${issue.message}`).join("\n")}`,
        },
        400,
      );
    }
  }),
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
  vValidator("param", jobFetchParamSchema),
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
