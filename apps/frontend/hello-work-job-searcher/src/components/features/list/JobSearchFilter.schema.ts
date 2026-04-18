import { Schema } from "effect";

export const SearchFilterSchema = Schema.Struct({
  companyName: Schema.optional(Schema.String),
  jobDescription: Schema.optional(Schema.String),
  jobDescriptionExclude: Schema.optional(Schema.String),
  occupation: Schema.optional(Schema.String),
  workPlace: Schema.optional(Schema.String),
  qualifications: Schema.optional(Schema.String),
  employmentType: Schema.optional(Schema.String),
  wageMin: Schema.optional(Schema.String),
  wageMax: Schema.optional(Schema.String),
  addedSince: Schema.optional(Schema.String),
  addedUntil: Schema.optional(Schema.String),
  orderByReceiveDate: Schema.optional(Schema.String),
  onlyNotExpired: Schema.optional(Schema.String),
  employeeCountGt: Schema.optional(Schema.String),
  employeeCountLt: Schema.optional(Schema.String),
});
export type SearchFilter = Schema.Schema.Type<typeof SearchFilterSchema>;
