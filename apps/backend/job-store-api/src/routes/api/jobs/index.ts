import { createD1DB } from "@sho/db";
import { Job, JobNumber } from "@sho/models";
import { Either, Schema } from "effect";
import { TreeFormatter } from "effect/ParseResult";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  describeRoute,
  validator as effectValidator,
  resolver,
} from "hono-openapi";
import { err, ok, okAsync, ResultAsync, safeTry } from "neverthrow";
import { createJobStoreDBClientAdapter } from "../../../adapters";
import {
  createFetchJobError,
  createFetchJobListError,
  createInsertJobDuplicationError,
  createInsertJobError,
} from "../../../adapters/error";
import { PAGE_SIZE } from "../../../constant";

// --- エラー型 ---

type EmployeeCountGtValidationError = {
  readonly _tag: "EmployeeCountGtValidationError";
  readonly message: string;
};

const createEmployeeCountGtValidationError = (
  message: string,
): EmployeeCountGtValidationError => ({
  _tag: "EmployeeCountGtValidationError",
  message,
});

type EmployeeCountLtValidationError = {
  readonly _tag: "EmployeeCountLtValidationError";
  readonly message: string;
};

const createEmployeeCountLtValidationError = (
  message: string,
): EmployeeCountLtValidationError => ({
  _tag: "EmployeeCountLtValidationError",
  message,
});

type UnexpectedError = {
  readonly _tag: "UnexpectedError";
  readonly message: string;
  readonly errorType: "server";
};

const createUnexpectedError = (message: string): UnexpectedError => ({
  _tag: "UnexpectedError",
  message,
  errorType: "server",
});

// --- スキーマ ---

const jobFetchParamSchema = Schema.Struct({
  jobNumber: JobNumber,
});

const jobListQuerySchema = Schema.Struct({
  companyName: Schema.optional(Schema.String),
  employeeCountLt: Schema.optional(Schema.String),
  employeeCountGt: Schema.optional(Schema.String),
  jobDescription: Schema.optional(Schema.String),
  jobDescriptionExclude: Schema.optional(Schema.String),
  onlyNotExpired: Schema.optional(Schema.Boolean),
  orderByReceiveDate: Schema.optional(
    Schema.Union(Schema.Literal("asc"), Schema.Literal("desc")),
  ),
  addedSince: Schema.optional(
    Schema.String.pipe(Schema.pattern(/^\d{4}-\d{2}-\d{2}$/)),
  ),
  addedUntil: Schema.optional(
    Schema.String.pipe(Schema.pattern(/^\d{4}-\d{2}-\d{2}$/)),
  ),
  page: Schema.optional(Schema.String),
});

const insertJobRequestBodySchema = Job;

const employeeCountSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);

// --- ルーティングスキーマ ---

const messageErrorSchema = Schema.Struct({
  message: Schema.String,
});

const errorResponses = {
  "400": {
    description: "client error response",
    content: {
      "application/json": {
        schema: resolver(Schema.standardSchemaV1(messageErrorSchema)),
      },
    },
  },
  "500": {
    description: "internal server error response",
    content: {
      "application/json": {
        schema: resolver(Schema.standardSchemaV1(messageErrorSchema)),
      },
    },
  },
} as const;

const jobListSuccessResponseSchema = Schema.Struct({
  jobs: Schema.Array(Job),
  meta: Schema.Struct({
    totalCount: Schema.Number,
    page: Schema.Number,
    totalPages: Schema.Number,
  }),
});

const insertJobSuccessResponseSchema = Schema.Struct({
  success: Schema.Literal(true),
  result: Schema.Struct({
    job: Job,
  }),
});

const jobListRoute = describeRoute({
  parameters: [
    { name: "companyName", in: "query", required: false },
    { name: "employeeCountGt", in: "query", required: false },
    { name: "employeeCountLt", in: "query", required: false },
    { name: "jobDescription", in: "query", required: false },
    { name: "jobDescriptionExclude", in: "query", required: false },
    { name: "onlyNotExpired", in: "query", required: false },
    {
      name: "orderByReceiveDate",
      in: "query",
      required: false,
      example: "desc",
    },
    {
      name: "addedSince",
      in: "query",
      description: "追加された日時（ISO形式）",
      example: "2025-10-17",
      required: false,
    },
    {
      name: "addedUntil",
      in: "query",
      description: "追加された日時（ISO形式）",
      example: "2025-10-17",
      required: false,
    },
    {
      name: "page",
      in: "query",
      description: "ページ番号（1始まり）",
      example: "1",
      required: false,
    },
  ],
  responses: {
    "200": {
      description: "Successful response",
      content: {
        "application/json": {
          schema: resolver(
            Schema.standardSchemaV1(jobListSuccessResponseSchema),
          ),
        },
      },
    },
    ...errorResponses,
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
            jobNumber: {
              type: "string",
              pattern: "^\\d{5}-\\d{0,8}$",
              description: "求人番号",
            },
            companyName: { type: "string", description: "会社名" },
            receivedDate: {
              type: "string",
              description: "受信日時（ISO形式）",
            },
            expiryDate: { type: "string", description: "有効期限（ISO形式）" },
            homePage: {
              type: "string",
              description: "ホームページURL（任意）",
            },
            occupation: { type: "string", description: "職業" },
            employmentType: { type: "string", description: "雇用形態" },
            wage: {
              type: "object",
              properties: {
                min: { type: "number", description: "最低賃金" },
                max: { type: "number", description: "最高賃金" },
              },
              required: ["min", "max"],
            },
            workingHours: {
              type: "object",
              properties: {
                start: { type: "string", description: "勤務開始時間" },
                end: { type: "string", description: "勤務終了時間" },
              },
              required: ["start", "end"],
            },
            employeeCount: { type: "number", description: "従業員数" },
            workPlace: { type: "string", description: "勤務地" },
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
            "jobNumber",
            "companyName",
            "receivedDate",
            "expiryDate",
            "occupation",
            "employmentType",
            "wage",
            "workingHours",
            "employeeCount",
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
          schema: resolver(
            Schema.standardSchemaV1(insertJobSuccessResponseSchema),
          ),
        },
      },
    },
    "409": {
      description: "duplication error response",
      content: {
        "application/json": {
          schema: resolver(Schema.standardSchemaV1(messageErrorSchema)),
        },
      },
    },
    ...errorResponses,
  },
});

const jobFetchRoute = describeRoute({
  responses: {
    "200": {
      description: "Successful response",
      content: {
        "application/json": {
          schema: resolver(Schema.standardSchemaV1(Job)),
        },
      },
    },
    ...errorResponses,
  },
});

// --- ルートハンドラ ---

const app = new Hono<{ Bindings: Env }>()
  .get(
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
        page: rawPage,
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

      const parsedPage = rawPage ? Number(rawPage) : 1;
      const page = Number.isNaN(parsedPage)
        ? 1
        : Math.max(1, Math.floor(parsedPage));

      const db = createD1DB(c.env.DB);
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
        const jobListResult = yield* await ResultAsync.fromSafePromise(
          dbClient.execute({
            type: "FetchJobsPage",
            options: {
              page,
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

        const totalPages = Math.ceil(meta.totalCount / PAGE_SIZE);

        return okAsync({
          jobs,
          meta: { totalCount: meta.totalCount, page, totalPages },
        });
      });
      return result.match(
        ({ jobs, meta }) => c.json({ jobs, meta }),
        (error) => {
          console.error(error);
          switch (error._tag) {
            case "EmployeeCountGtValidationError":
            case "EmployeeCountLtValidationError":
              throw new HTTPException(400, {
                message: `Invalid employee count Gt: ${rawEmployeeCountGt}, Lt: ${rawEmployeeCountLt}`,
              });
            default:
              throw new HTTPException(500, {
                message: "internal server error",
              });
          }
        },
      );
    },
  )
  .post(
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
      const db = createD1DB(c.env.DB);
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
  )
  .get(
    "/:jobNumber",
    jobFetchRoute,
    effectValidator("param", Schema.standardSchemaV1(jobFetchParamSchema)),
    (c) => {
      const { jobNumber } = c.req.valid("param");
      const db = createD1DB(c.env.DB);
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
              throw new HTTPException(500, {
                message: "internal server error",
              });
          }
        },
      );
    },
  );
export default app;
