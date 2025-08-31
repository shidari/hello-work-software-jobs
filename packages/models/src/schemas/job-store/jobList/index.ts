import { number, object, optional, string } from "valibot";
import { JobListSchema, searchFilterSchema } from "../client";

export const jobListQuerySchema = object({
  ...searchFilterSchema.entries,
  employeeCountLt: optional(string()),
  employeeCountGt: optional(string()),
});

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
