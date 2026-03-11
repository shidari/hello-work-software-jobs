import { JobNumber } from "@sho/models";
import { Schema } from "effect";

// ── クローラー設定スキーマ ──

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
  jobNumber: Schema.optional(JobNumber),
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
  jobSearchCriteria: jobSearchCriteriaSchema,
});

// ── 型エイリアス ──

export type JobSearchCriteria = typeof jobSearchCriteriaSchema.Type;
export type DirtyWorkLocation = typeof partialWorkLocationSchema.Type;
export type EmploymentType = typeof partialEmploymentTypeSchema.Type;
export type EngineeringLabel = typeof paritalEngineeringLabelSchema.Type;
export type SearchPeriod = typeof searchPeriodSchema.Type;

export type etCrawlerConfig =
  typeof etCrawlerConfigWithoutBrowserConfigSchema.Type;
