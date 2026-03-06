import { JobNumber } from "@sho/models";
import { Schema } from "effect";
import type { Locator, Page } from "../browser";

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
  nextPageDelayMs: Schema.Number,
  jobSearchCriteria: jobSearchCriteriaSchema,
});

// ── 型エイリアス ──

export type NewJobOpeningsFilter = "TodayYesterday" | "Within1Week";

const jobDetailPage = Symbol();
export type JobDetailPage = Page & { [jobDetailPage]: unknown };

const jobSearchPage = Symbol();

export type JobSearchPage = Page & {
  [jobSearchPage]: unknown;
};

const firstJobListPage = Symbol();

export type FirstJobListPage = Page & { [firstJobListPage]: unknown };

const jobListPage = Symbol();

export type JobListPage =
  | FirstJobListPage
  | (Page & { [jobListPage]: unknown });

export type EngineeringLabelSelector = {
  radioBtn: EngineeringLabelSelectorRadioBtn;
  openerSibling: EngineeringLabelSelectorOpenerSibling;
};

const engineeringLabelSelectorRadioBtn = Symbol();
export type EngineeringLabelSelectorRadioBtn = string & {
  [engineeringLabelSelectorRadioBtn]: unknown;
};
const engineeringLabelSelectorOpener = Symbol();

//　直接openerのセレクタをとってこれないため
export type EngineeringLabelSelectorOpenerSibling = string & {
  [engineeringLabelSelectorOpener]: unknown;
};

const jobOverviewList = Symbol();
export type JobOverViewList = Locator[] & {
  [jobOverviewList]: unknown;
};

const emplomentTypeSelector = Symbol();
export type EmploymentTypeSelector = string & {
  [emplomentTypeSelector]: unknown;
};

export type JobSearchCriteria = typeof jobSearchCriteriaSchema.Type;
export type DirtyWorkLocation = typeof partialWorkLocationSchema.Type;
export type EmploymentType = typeof partialEmploymentTypeSchema.Type;
export type EngineeringLabel = typeof paritalEngineeringLabelSchema.Type;
export type SearchPeriod = typeof searchPeriodSchema.Type;

export type etCrawlerConfig =
  typeof etCrawlerConfigWithoutBrowserConfigSchema.Type;
