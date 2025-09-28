import type { Page } from "playwright";
import type * as v from "valibot";
import type { ScrapedJobSchema } from "../../schemas";

const jobDetailPage = Symbol();
export type JobDetailPage = Page & { [jobDetailPage]: unknown };

export type ScrapedJob = v.InferOutput<typeof ScrapedJobSchema>;
