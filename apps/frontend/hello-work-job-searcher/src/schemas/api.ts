import { job } from "@sho/models";
import * as v from "valibot";

// 検索フィルター
export const searchFilterSchema = v.object({
  companyName: v.optional(v.string()),
  employeeCountLt: v.optional(v.pipe(v.number(), v.integer())),
  employeeCountGt: v.optional(v.pipe(v.number(), v.integer())),
  jobDescription: v.optional(v.string()),
  jobDescriptionExclude: v.optional(v.string()),
  onlyNotExpired: v.optional(v.boolean()),
  orderByReceiveDate: v.optional(
    v.union([v.literal("asc"), v.literal("desc")]),
  ),
  addedSince: v.optional(v.pipe(v.string(), v.isoDate())),
  addedUntil: v.optional(v.pipe(v.string(), v.isoDate())),
});

export type SearchFilter = v.InferOutput<typeof searchFilterSchema>;

// Job リスト用スキーマ (id, createdAt, updatedAt, status を除外)
const { id, createdAt, updatedAt, status, ...jobListFields } = job.entries;
export const JobListSchema = v.array(v.object({ ...jobListFields }));
export type JobList = v.InferOutput<typeof JobListSchema>;

// Job 詳細用スキーマ (id を除外)
const { id: _id, ...jobWithoutId } = job.entries;
export const JobSchema = v.object({ ...jobWithoutId });

// URL クエリパラメータ用 (数値は文字列として受け取る)
export const jobListQuerySchema = v.object({
  ...searchFilterSchema.entries,
  employeeCountLt: v.optional(v.string()),
  employeeCountGt: v.optional(v.string()),
});
export type JobListQuery = v.InferOutput<typeof jobListQuerySchema>;

// API レスポンススキーマ
export const jobListSuccessResponseSchema = v.object({
  jobs: JobListSchema,
  nextToken: v.optional(v.string()),
  meta: v.object({
    totalCount: v.number(),
  }),
});

export const jobFetchSuccessResponseSchema = JobSchema;
