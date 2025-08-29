import { array, boolean, number, object, optional, string } from "valibot";
import { jobSelectSchema } from "../drizzle";

export const searchFilterSchema = object({
  companyName: optional(string()),
  employeeCountLt: optional(number()),
  employeeCountGt: optional(number()),
  jobDescription: optional(string()),
  jobDescriptionExclude: optional(string()), // 除外キーワード
  onlyNotExpired: optional(boolean()),
});

export const jobListQuerySchema = searchFilterSchema;

export const jobListSearchFilterSchema = searchFilterSchema;

const { id, createdAt, updatedAt, status, ...jobSelectSchemaWithoutSome } =
  jobSelectSchema.entries;
export const JobListSchema = array(object({ ...jobSelectSchemaWithoutSome }));

export const jobListSuccessResponseSchema = object({
  jobs: JobListSchema,
  nextToken: optional(string()),
  meta: object({
    totalCount: number(),
  }),
});

export const jobListClientErrorResponseSchema = object({
  message: string(),
});

export const jobListServerErrorSchema = object({
  message: string(),
});
