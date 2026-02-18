import { Schema } from "effect";
import { jobSelectSchema } from "./drizzle";

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

const { id, createdAt, updatedAt, status, ...jobSelectSchemaWithoutSome } =
  jobSelectSchema.fields;
export const JobListSchema = Schema.Array(
  Schema.Struct({ ...jobSelectSchemaWithoutSome }),
);

// id を除外
const { id: _, ...jobSelectSchemaWithoutId } = jobSelectSchema.fields;
export const JobSchema = Schema.Struct({ ...jobSelectSchemaWithoutId });
