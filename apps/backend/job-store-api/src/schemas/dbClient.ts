import { Job } from "@sho/models";
import { Schema } from "effect";

export const searchFilterSchema = Schema.Struct({
  companyName: Schema.optional(Schema.String),
  employeeCountLt: Schema.optional(Schema.Number.pipe(Schema.int())),
  employeeCountGt: Schema.optional(Schema.Number.pipe(Schema.int())),
  jobDescription: Schema.optional(Schema.String),
  jobDescriptionExclude: Schema.optional(Schema.String), // 除外キーワード
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

export const JobListSchema = Schema.Array(Job);

export const JobSchema = Schema.Struct({
  ...Job.fields,
  status: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});
