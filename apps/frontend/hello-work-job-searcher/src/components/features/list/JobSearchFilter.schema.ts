import { Schema } from "effect";
import {
  RawEmploymentType,
  RawJobCategory,
  RawWageType,
} from "@sho/models/raw";

export const SearchFilterSchema = Schema.Struct({
  companyName: Schema.optional(Schema.String),
  jobDescription: Schema.optional(Schema.String),
  jobDescriptionExclude: Schema.optional(Schema.String),
  occupation: Schema.optional(Schema.String),
  workPlace: Schema.optional(Schema.String),
  qualifications: Schema.optional(Schema.String),
  employmentType: Schema.optional(RawEmploymentType),
  jobCategory: Schema.optional(RawJobCategory),
  wageType: Schema.optional(RawWageType),
  wageMin: Schema.optional(Schema.String),
  wageMax: Schema.optional(Schema.String),
  addedSince: Schema.optional(Schema.String),
  addedUntil: Schema.optional(Schema.String),
  orderByReceiveDate: Schema.optional(
    Schema.Union(Schema.Literal("asc"), Schema.Literal("desc")),
  ),
  onlyNotExpired: Schema.optional(Schema.Literal("true")),
  employeeCountGt: Schema.optional(Schema.String),
  employeeCountLt: Schema.optional(Schema.String),
});
export type SearchFilter = Schema.Schema.Type<typeof SearchFilterSchema>;
