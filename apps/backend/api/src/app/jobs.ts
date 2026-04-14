import { Job, JobNumber } from "@sho/models";
import { RawEmployeeCount, RawWage } from "@sho/models/raw";
import { Effect, ParseResult, Schema } from "effect";
import { Hono } from "hono";
import {
  describeRoute,
  validator as effectValidator,
  resolver,
} from "hono-openapi";
import { PAGE_SIZE } from "../constant";
import { InsertJobCommand, InsertJobDuplicationError } from "../cqrs/commands";
import {
  FetchJobError,
  FetchJobsPageQuery,
  FindJobByNumberQuery,
} from "../cqrs/queries";
import { SearchFilterSchema } from "../cqrs/schema";
import { JobStoreDB } from "../infra/db";
import { LoggerLayer, logErrorCause, runLog } from "../log";
import { verifyApiKey } from "../middleware/api-key";

// --- スキーマ ---

const jobFetchParamSchema = Schema.Struct({
  jobNumber: JobNumber,
});

/** クエリパラメータ（文字列） → SearchFilter + page への一括変換 */
const SearchQueryParams = Schema.Struct({
  companyName: Schema.optional(Schema.String),
  employeeCountLt: Schema.optional(Schema.String),
  employeeCountGt: Schema.optional(Schema.String),
  jobDescription: Schema.optional(Schema.String),
  jobDescriptionExclude: Schema.optional(Schema.String),
  onlyNotExpired: Schema.optional(Schema.String),
  orderByReceiveDate: Schema.optional(Schema.String),
  addedSince: Schema.optional(Schema.String),
  addedUntil: Schema.optional(Schema.String),
  occupation: Schema.optional(Schema.String),
  employmentType: Schema.optional(Schema.String),
  wageMin: Schema.optional(Schema.String),
  wageMax: Schema.optional(Schema.String),
  workPlace: Schema.optional(Schema.String),
  qualifications: Schema.optional(Schema.String),
  jobCategory: Schema.optional(Schema.String),
  wageType: Schema.optional(Schema.String),
  education: Schema.optional(Schema.String),
  industryClassification: Schema.optional(Schema.String),
  page: Schema.optional(Schema.String),
});

const SearchFilterQuerySchema = Schema.transformOrFail(
  SearchQueryParams,
  Schema.Struct({
    filter: SearchFilterSchema,
    page: Schema.Number,
  }),
  {
    strict: true,
    decode: (raw) => {
      const EmployeeCountFromString = Schema.compose(
        Schema.NumberFromString,
        RawEmployeeCount,
      );
      const WageFromString = Schema.compose(Schema.NumberFromString, RawWage);

      const parsedPage = raw.page ? Number(raw.page) : 1;
      return ParseResult.succeed({
        filter: Schema.decodeUnknownSync(SearchFilterSchema)({
          companyName: raw.companyName,
          employeeCountLt: raw.employeeCountLt
            ? Schema.decodeUnknownSync(EmployeeCountFromString)(
                raw.employeeCountLt,
              )
            : undefined,
          employeeCountGt: raw.employeeCountGt
            ? Schema.decodeUnknownSync(EmployeeCountFromString)(
                raw.employeeCountGt,
              )
            : undefined,
          jobDescription: raw.jobDescription,
          jobDescriptionExclude: raw.jobDescriptionExclude,
          onlyNotExpired: raw.onlyNotExpired === "true" ? true : undefined,
          orderByReceiveDate: raw.orderByReceiveDate,
          addedSince: raw.addedSince,
          addedUntil: raw.addedUntil,
          occupation: raw.occupation,
          employmentType: raw.employmentType,
          wageMin: raw.wageMin
            ? Schema.decodeUnknownSync(WageFromString)(raw.wageMin)
            : undefined,
          wageMax: raw.wageMax
            ? Schema.decodeUnknownSync(WageFromString)(raw.wageMax)
            : undefined,
          workPlace: raw.workPlace,
          qualifications: raw.qualifications,
          jobCategory: raw.jobCategory,
          wageType: raw.wageType,
          education: raw.education,
          industryClassification: raw.industryClassification,
        }),
        page: Number.isNaN(parsedPage)
          ? 1
          : Math.max(1, Math.floor(parsedPage)),
      });
    },
    encode: (val, _, ast) =>
      ParseResult.fail(new ParseResult.Type(ast, val, "encode not supported")),
  },
);

const insertJobRequestBodySchema = Job;

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

export const jobListSuccessResponseSchema = Schema.Struct({
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
    effectValidator("query", Schema.standardSchemaV1(SearchFilterQuerySchema)),
    (c) => {
      const { filter, page } = c.req.valid("query");
      const db = JobStoreDB.main(c.env.DB);

      return Effect.runPromise(
        Effect.gen(function* () {
          const query = yield* FetchJobsPageQuery;
          const { jobs, meta } = yield* query.run({ page, filter });
          const totalPages = Math.ceil(meta.totalCount / PAGE_SIZE);
          return {
            jobs,
            meta: { totalCount: meta.totalCount, page, totalPages },
          };
        }).pipe(
          Effect.provide(FetchJobsPageQuery.Default),
          Effect.provideService(JobStoreDB, db),
          Effect.tapErrorCause((cause) =>
            logErrorCause("fetch jobs failed", cause),
          ),
          Effect.match({
            onSuccess: (data) => c.json(data),
            onFailure: () => c.json({ message: "internal server error" }, 500),
          }),
          Effect.provide(LoggerLayer),
        ),
      );
    },
  )
  .post(
    "/",
    jobInsertRoute,
    verifyApiKey,
    effectValidator(
      "json",
      Schema.standardSchemaV1(insertJobRequestBodySchema),
      (result, c) => {
        if (!result.success) {
          const detail = result.error.map((issue) => issue.message).join("\n");
          void runLog(
            Effect.logWarning("invalid job insert request body").pipe(
              Effect.annotateLogs({ detail }),
            ),
          );
          return c.json(
            { message: `Invalid request body. detail: ${detail}` },
            400,
          );
        }
        return undefined;
      },
    ),
    async (c) => {
      const body = c.req.valid("json");
      const db = JobStoreDB.main(c.env.DB);

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
          Effect.tapErrorCause((cause) =>
            logErrorCause("insert job failed", cause).pipe(
              Effect.annotateLogs({ jobNumber: body.jobNumber }),
            ),
          ),
          Effect.match({
            onSuccess: (job) => c.json(job),
            onFailure: (error) => {
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
          Effect.provide(LoggerLayer),
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
      const db = JobStoreDB.main(c.env.DB);

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
          Effect.tapErrorCause((cause) =>
            logErrorCause("fetch job failed", cause).pipe(
              Effect.annotateLogs({ jobNumber }),
            ),
          ),
          Effect.match({
            onSuccess: (job) => c.json(job),
            onFailure: (error) => {
              switch (error._tag) {
                case "FetchJobError":
                  return c.json({ message: "Job not found" }, 404);
                default:
                  return c.json({ message: "internal server error" }, 500);
              }
            },
          }),
          Effect.provide(LoggerLayer),
        ),
      );
    },
  );
export default app;
