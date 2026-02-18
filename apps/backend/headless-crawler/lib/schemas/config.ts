import { jobNumberSchema } from "@sho/models";
import { Schema } from "effect";

export const partialWorkLocationSchema = Schema.Struct({
  prefecture: Schema.Literal("東京都"),
});
export const partialEmploymentTypeSchema = Schema.Union(
  Schema.Literal("RegularEmployee"),
  Schema.Literal("PartTimeWorker"),
);
export const paritalEngineeringLabelSchema = Schema.Literal(
  "ソフトウェア開発技術者、プログラマー",
);
export const searchPeriodSchema = Schema.Union(
  Schema.Literal("all"),
  Schema.Literal("today"),
  Schema.Literal("week"),
);
export const jobSearchCriteriaSchema = Schema.Struct({
  jobNumber: Schema.optional(jobNumberSchema),
  workLocation: partialWorkLocationSchema,
  desiredOccupation: Schema.optional(
    Schema.Struct({
      occupationSelection: Schema.optional(paritalEngineeringLabelSchema),
    }),
  ),
  employmentType: partialEmploymentTypeSchema,
  searchPeriod: searchPeriodSchema,
});

export const etCrawlerConfigWithoutBrowserConfigSchema = Schema.Struct({
  roughMaxCount: Schema.Number,
  nextPageDelayMs: Schema.Number,
  jobSearchCriteria: jobSearchCriteriaSchema,
});
