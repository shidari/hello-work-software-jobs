import {
  EmploymentType,
  EstablishmentNumber,
  JobCategory,
  WageType,
} from "@sho/models";
import { Schema } from "effect";

const DatePattern = Schema.String.pipe(Schema.pattern(/^\d{4}-\d{2}-\d{2}$/));

const SEARCH_TEXT_MAX = 100;
const SearchText = Schema.String.pipe(Schema.maxLength(SEARCH_TEXT_MAX));

export const SearchFilterSchema = Schema.Struct({
  companyName: Schema.optional(SearchText),
  employeeCountLt: Schema.optional(Schema.NonNegativeInt),
  employeeCountGt: Schema.optional(Schema.NonNegativeInt),
  jobDescription: Schema.optional(SearchText),
  jobDescriptionExclude: Schema.optional(SearchText),
  onlyNotExpired: Schema.optional(Schema.Boolean),
  orderByReceiveDate: Schema.optional(
    Schema.Union(Schema.Literal("asc"), Schema.Literal("desc")),
  ),
  addedSince: Schema.optional(DatePattern),
  addedUntil: Schema.optional(DatePattern),
  occupation: Schema.optional(SearchText),
  employmentType: Schema.optional(EmploymentType),
  wageMin: Schema.optional(Schema.NonNegativeInt),
  wageMax: Schema.optional(Schema.NonNegativeInt),
  workPlace: Schema.optional(SearchText),
  qualifications: Schema.optional(SearchText),
  jobCategory: Schema.optional(JobCategory),
  wageType: Schema.optional(WageType),
  education: Schema.optional(SearchText),
  industryClassification: Schema.optional(SearchText),
  establishmentNumber: Schema.optional(EstablishmentNumber),
});

export type SearchFilter = typeof SearchFilterSchema.Type;
