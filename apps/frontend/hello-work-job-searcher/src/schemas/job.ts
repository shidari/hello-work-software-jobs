import { Schema } from "effect";

const ISODateSchema = Schema.String.pipe(
  Schema.pattern(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
  ),
);

export const JobOverviewSchema = Schema.Struct({
  jobNumber: Schema.String,
  companyName: Schema.optional(Schema.String),
  workPlace: Schema.String,
  jobTitle: Schema.String,
  employmentType: Schema.String, // 後でもっと型を細かくする
  employeeCount: Schema.Number,
  receivedDate: ISODateSchema,
});

export const JobDetailSchema = Schema.Struct({
  ...JobOverviewSchema.fields,
  salary: Schema.String,
  jobDescription: Schema.String,
  expiryDate: Schema.String,
  workingHours: Schema.String,
  qualifications: Schema.optional(Schema.String),
});

export type TJobOverview = typeof JobOverviewSchema.Type;
export type TJobDetail = typeof JobDetailSchema.Type;
