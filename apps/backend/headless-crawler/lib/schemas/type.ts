import type { Locator, Page } from "playwright";
import type {
  etCrawlerConfigWithoutBrowserConfigSchema,
  jobSearchCriteriaSchema,
  paritalEngineeringLabelSchema,
  partialEmploymentTypeSchema,
  partialWorkLocationSchema,
  searchPeriodSchema,
} from "./config";
import type { extractedJobSchema, JobNumber } from "./extractor";
import type { eventSchema } from "./lambdaEvent";
import type { transformedSchema } from "./transformer";

export type { JobNumber };

export type JobMetadata = {
  jobNumber: JobNumber;
};

export type NewJobOpeningsFilter = "TodayYesterday" | "Within1Week";

const jobDetailPage = Symbol();
export type JobDetailPage = Page & { [jobDetailPage]: unknown };

export type extractedJob = typeof extractedJobSchema.Type;

export type TransformedJob = typeof transformedSchema.Type;

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

export type JobNumberEvent = typeof eventSchema.Type;

export type JobSearchCriteria = typeof jobSearchCriteriaSchema.Type;
export type DirtyWorkLocation = typeof partialWorkLocationSchema.Type;
export type EmploymentType = typeof partialEmploymentTypeSchema.Type;
export type EngineeringLabel = typeof paritalEngineeringLabelSchema.Type;
export type SearchPeriod = typeof searchPeriodSchema.Type;

export type etCrawlerConfig =
  typeof etCrawlerConfigWithoutBrowserConfigSchema.Type;
