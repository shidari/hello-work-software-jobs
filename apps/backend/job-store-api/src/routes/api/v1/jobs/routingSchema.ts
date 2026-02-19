import { Job } from "@sho/models";
import { Schema } from "effect";
import { describeRoute, resolver } from "hono-openapi";
import { JobSchema } from "../../../../schemas/type";

// --- エラーレスポンススキーマ ---

const messageErrorSchema = Schema.Struct({
  message: Schema.String,
});

// --- 成功レスポンススキーマ ---

export const jobListSuccessResponseSchema = Schema.Struct({
  jobs: Schema.Array(Job),
  nextToken: Schema.optional(Schema.String),
  meta: Schema.Struct({
    totalCount: Schema.Number,
  }),
});

const insertJobSuccessResponseSchema = Schema.Struct({
  success: Schema.Literal(true),
  result: Schema.Struct({
    job: Job,
  }),
});

export const jobListRoute = describeRoute({
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
  },
});

export const jobInsertRoute = describeRoute({
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
  },
});

export const jobFetchRoute = describeRoute({
  responses: {
    "200": {
      description: "Successful response",
      content: {
        "application/json": {
          schema: resolver(Schema.standardSchemaV1(JobSchema)),
        },
      },
    },
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
  },
});
