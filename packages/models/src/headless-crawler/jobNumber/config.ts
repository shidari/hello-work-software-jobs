import * as v from "valibot";
import { jobNumberSchema } from "../jobDetail";

export const partialWorkLocationSchema = v.object({
  prefecture: v.literal("東京都"),
});
export const partialEmploymentTypeSchema = v.union([
  v.literal("RegularEmployee"),
  v.literal("PartTimeWorker"),
]);
export const paritalEngineeringLabelSchema = v.literal(
  "ソフトウェア開発技術者、プログラマー",
);
export const searchPeriodSchema = v.union([
  v.literal("all"),
  v.literal("today"),
  v.literal("week"),
]);
export const jobSearchCriteriaSchema = v.object({
  jobNumber: v.optional(jobNumberSchema),
  workLocation: partialWorkLocationSchema,
  desiredOccupation: v.optional(
    v.object({
      occupationSelection: v.optional(paritalEngineeringLabelSchema),
    }),
  ),
  employmentType: partialEmploymentTypeSchema,
  searchPeriod: searchPeriodSchema,
});

export const etCrawlerConfigWithoutBrowserConfigSchema = v.object({
  roughMaxCount: v.number(),
  nextPageDelayMs: v.number(),
  jobSearchCriteria: jobSearchCriteriaSchema,
});
