import { Schema } from "effect";
import { JobListSchema, searchFilterSchema } from "../dbClient";

export const jobListQuerySchema = Schema.Struct({
  ...searchFilterSchema.fields,
  employeeCountLt: Schema.optional(Schema.String),
  employeeCountGt: Schema.optional(Schema.String),
});

export const jobListSuccessResponseSchema = Schema.Struct({
  jobs: JobListSchema,
  nextToken: Schema.optional(Schema.String),
  meta: Schema.Struct({
    totalCount: Schema.Number,
  }),
});

export const jobListClientErrorResponseSchema = Schema.Struct({
  message: Schema.String,
});

export const jobListServerErrorSchema = Schema.Struct({
  message: Schema.String,
});
