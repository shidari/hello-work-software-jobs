import type { LaunchOptions, Locator, Page } from "playwright";
import type * as v from "valibot";
import type {
	etCrawlerConfigWithoutBrowserConfigSchema,
	jobSearchCriteriaSchema,
	paritalEngineeringLabelSchema,
	partialEmploymentTypeSchema,
	partialWorkLocationSchema,
	searchPeriodSchema,
} from "./config";
import type { extractedJobSchema, jobNumberSchema } from "./extractor";
import type { eventSchema } from "./lambdaEvent";
import type { transformedSchema } from "./transformer";

export type JobNumber = v.InferOutput<typeof jobNumberSchema>;

export type JobMetadata = {
	jobNumber: JobNumber;
};

export type NewJobOpeningsFilter = "TodayYesterday" | "Within1Week";

const jobDetailPage = Symbol();
export type JobDetailPage = Page & { [jobDetailPage]: unknown };

export type extractedJob = v.InferOutput<typeof extractedJobSchema>;

export type TransformedJob = v.InferOutput<typeof transformedSchema>;

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

export type JobNumberEvent = v.InferOutput<typeof eventSchema>;

export type JobSearchCriteria = v.InferOutput<typeof jobSearchCriteriaSchema>;
export type DirtyWorkLocation = v.InferOutput<
	typeof partialWorkLocationSchema
>;
export type EmploymentType = v.InferOutput<
	typeof partialEmploymentTypeSchema
>;
export type EngineeringLabel = v.InferOutput<
	typeof paritalEngineeringLabelSchema
>;
export type SearchPeriod = v.InferOutput<typeof searchPeriodSchema>;

export type etCrawlerConfig = v.InferOutput<
	typeof etCrawlerConfigWithoutBrowserConfigSchema
> & {
	browserConfig: Pick<LaunchOptions, "headless" | "executablePath" | "args">;
};
