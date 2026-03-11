import { createD1DB } from "@sho/db";
import { Job, JobNumber } from "@sho/models";
import { Data, Effect, Schema } from "effect";
import { TreeFormatter } from "effect/ParseResult";
import { Hono } from "hono";
import {
  describeRoute,
  validator as effectValidator,
  resolver,
} from "hono-openapi";
import { PAGE_SIZE } from "../../constant";
import { JobStoreDB } from "../../cqrs";
import {
  InsertJobCommand,
  InsertJobDuplicationError,
} from "../../cqrs/commands";
import {
  FetchJobError,
  FetchJobsPageQuery,
  FindJobByNumberQuery,
} from "../../cqrs/queries";

// --- ローカルエラー型 ---

class EmployeeCountGtValidationError extends Data.TaggedError(
  "EmployeeCountGtValidationError",
)<{
  readonly message: string;
}> {}

class EmployeeCountLtValidationError extends Data.TaggedError(
  "EmployeeCountLtValidationError",
)<{
  readonly message: string;
}> {}

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
  occupation: Schema.optional(Schema.String),
  employmentType: Schema.optional(Schema.String),
  wageMin: Schema.optional(Schema.String),
  wageMax: Schema.optional(Schema.String),
  workPlace: Schema.optional(Schema.String),
  qualifications: Schema.optional(Schema.String),
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
    { name: "occupation", in: "query", required: false },
    { name: "employmentType", in: "query", required: false },
    {
      name: "wageMin",
      in: "query",
      description: "最低賃金の下限",
      required: false,
    },
    {
      name: "wageMax",
      in: "query",
      description: "最高賃金の上限",
      required: false,
    },
    { name: "workPlace", in: "query", required: false },
    { name: "qualifications", in: "query", required: false },
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
        occupation: encodedOccupation,
        employmentType: encodedEmploymentType,
        wageMin: rawWageMin,
        wageMax: rawWageMax,
        workPlace: encodedWorkPlace,
        qualifications: encodedQualifications,
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
      const occupation = encodedOccupation
        ? decodeURIComponent(encodedOccupation)
        : undefined;
      const employmentType = encodedEmploymentType
        ? decodeURIComponent(encodedEmploymentType)
        : undefined;
      const wageMin = rawWageMin ? Number(rawWageMin) : undefined;
      const wageMax = rawWageMax ? Number(rawWageMax) : undefined;
      const workPlace = encodedWorkPlace
        ? decodeURIComponent(encodedWorkPlace)
        : undefined;
      const qualifications = encodedQualifications
        ? decodeURIComponent(encodedQualifications)
        : undefined;

      const parsedPage = rawPage ? Number(rawPage) : 1;
      const page = Number.isNaN(parsedPage)
        ? 1
        : Math.max(1, Math.floor(parsedPage));

      const db = createD1DB(c.env.DB);

      return Effect.runPromise(
        Effect.gen(function* () {
          const employeeCountGt =
            rawEmployeeCountGt !== undefined
              ? yield* Schema.decode(employeeCountSchema)(
                  Number(rawEmployeeCountGt),
                ).pipe(
                  Effect.mapError(
                    (parseError) =>
                      new EmployeeCountGtValidationError({
                        message: `Invalid employeeCountGt. received: ${JSON.stringify(rawEmployeeCountGt)}\n${TreeFormatter.formatErrorSync(parseError)}`,
                      }),
                  ),
                )
              : undefined;
          const employeeCountLt =
            rawEmployeeCountLt !== undefined
              ? yield* Schema.decode(employeeCountSchema)(
                  Number(rawEmployeeCountLt),
                ).pipe(
                  Effect.mapError(
                    (parseError) =>
                      new EmployeeCountLtValidationError({
                        message: `Invalid employeeCountLt. received: ${JSON.stringify(rawEmployeeCountLt)}\n${TreeFormatter.formatErrorSync(parseError)}`,
                      }),
                  ),
                )
              : undefined;

          const query = yield* FetchJobsPageQuery;
          const { jobs, meta } = yield* query.run({
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
              occupation,
              employmentType,
              wageMin,
              wageMax,
              workPlace,
              qualifications,
            },
          });
          const totalPages = Math.ceil(meta.totalCount / PAGE_SIZE);
          return {
            jobs,
            meta: { totalCount: meta.totalCount, page, totalPages },
          };
        }).pipe(
          Effect.provide(FetchJobsPageQuery.Default),
          Effect.provideService(JobStoreDB, db),
          Effect.match({
            onSuccess: (data) => c.json(data),
            onFailure: (error) => {
              console.error(error);
              switch (error._tag) {
                case "EmployeeCountGtValidationError":
                case "EmployeeCountLtValidationError":
                  return c.json(
                    {
                      message: `Invalid employee count Gt: ${rawEmployeeCountGt}, Lt: ${rawEmployeeCountLt}`,
                    },
                    400,
                  );
                default:
                  return c.json({ message: "internal server error" }, 500);
              }
            },
          }),
        ),
      );
    },
  )
  .post(
    "/",
    jobInsertRoute,
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
        return undefined;
      },
    ),
    async (c) => {
      console.log("in job insert route");
      const body = c.req.valid("json");
      const db = createD1DB(c.env.DB);

      return Effect.runPromise(
        Effect.gen(function* () {
          const find = yield* FindJobByNumberQuery;
          const existing = yield* find.run(body.jobNumber);
          if (existing !== null) {
            return yield* new InsertJobDuplicationError({
              message: "Job with the same jobNumber already exists",
              errorType: "client",
            });
          }
          const insert = yield* InsertJobCommand;
          return yield* insert.run(body);
        }).pipe(
          Effect.provide(InsertJobCommand.Default),
          Effect.provide(FindJobByNumberQuery.Default),
          Effect.provideService(JobStoreDB, db),
          Effect.match({
            onSuccess: (job) => c.json(job),
            onFailure: (error) => {
              console.error(error);
              switch (error._tag) {
                case "InsertJobDuplicationError":
                  return c.json({ message: error.message }, 409);
                case "InsertJobError":
                  return c.json({ message: error.message }, 500);
                case "FetchJobError":
                  return c.json({ message: error.message }, 500);
                default:
                  return c.json({ message: "internal server error" }, 500);
              }
            },
          }),
        ),
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

      return Effect.runPromise(
        Effect.gen(function* () {
          const query = yield* FindJobByNumberQuery;
          const job = yield* query.run(jobNumber);
          if (job === null) {
            return yield* new FetchJobError({
              message: "Job not found",
              errorType: "client",
            });
          }
          return job;
        }).pipe(
          Effect.provide(FindJobByNumberQuery.Default),
          Effect.provideService(JobStoreDB, db),
          Effect.match({
            onSuccess: (job) => c.json(job),
            onFailure: (error) => {
              console.error(error);
              switch (error._tag) {
                case "FetchJobError":
                  return c.json({ message: "Job not found" }, 404);
                default:
                  return c.json({ message: "internal server error" }, 500);
              }
            },
          }),
        ),
      );
    },
  );
export default app;
