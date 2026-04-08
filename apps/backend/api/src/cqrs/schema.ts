import { EmploymentType, JobCategory, WageType } from "@sho/models";
import { Schema } from "effect";

const DatePattern = Schema.String.pipe(Schema.pattern(/^\d{4}-\d{2}-\d{2}$/));

export const SearchFilterSchema = Schema.Struct({
  companyName: Schema.optional(Schema.String),
  employeeCountLt: Schema.optional(Schema.NonNegativeInt),
  employeeCountGt: Schema.optional(Schema.NonNegativeInt),
  jobDescription: Schema.optional(Schema.String),
  jobDescriptionExclude: Schema.optional(Schema.String),
  onlyNotExpired: Schema.optional(Schema.Boolean),
  orderByReceiveDate: Schema.optional(
    Schema.Union(Schema.Literal("asc"), Schema.Literal("desc")),
  ),
  addedSince: Schema.optional(DatePattern),
  addedUntil: Schema.optional(DatePattern),
  occupation: Schema.optional(Schema.String),
  employmentType: Schema.optional(EmploymentType),
  wageMin: Schema.optional(Schema.NonNegativeInt),
  wageMax: Schema.optional(Schema.NonNegativeInt),
  workPlace: Schema.optional(Schema.String),
  qualifications: Schema.optional(Schema.String),
  jobCategory: Schema.optional(JobCategory),
  wageType: Schema.optional(WageType),
  education: Schema.optional(Schema.String),
  industryClassification: Schema.optional(Schema.String),
});

export type SearchFilter = typeof SearchFilterSchema.Type;
