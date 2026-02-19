import { Job } from "@sho/models";
import { Schema } from "effect";

// 検索フィルター
export const searchFilterSchema = Schema.Struct({
  companyName: Schema.optional(Schema.String),
  employeeCountLt: Schema.optional(Schema.Number.pipe(Schema.int())),
  employeeCountGt: Schema.optional(Schema.Number.pipe(Schema.int())),
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
});

export type SearchFilter = typeof searchFilterSchema.Type;

// Job リスト用スキーマ (ドメインモデルそのまま)
export const JobListSchema = Schema.Array(Job);
export type JobList = typeof JobListSchema.Type;

// Job 詳細用スキーマ (ドメインモデル + DB メタ情報)
export const JobSchema = Schema.Struct({
  ...Job.fields,
  status: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

// URL クエリパラメータ用 (数値は文字列として受け取る)
export const jobListQuerySchema = Schema.Struct({
  ...searchFilterSchema.fields,
  employeeCountLt: Schema.optional(Schema.String),
  employeeCountGt: Schema.optional(Schema.String),
});
export type JobListQuery = typeof jobListQuerySchema.Type;

// API レスポンススキーマ
export const jobListSuccessResponseSchema = Schema.Struct({
  jobs: JobListSchema,
  nextToken: Schema.optional(Schema.String),
  meta: Schema.Struct({
    totalCount: Schema.Number,
  }),
});

export const jobFetchSuccessResponseSchema = JobSchema;
