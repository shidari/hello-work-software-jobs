import type { JobDetailSchema, JobOverviewSchema } from ".";
import type * as v from "valibot";
export type TJobOverview = v.InferOutput<typeof JobOverviewSchema>;
export type TJobDetail = v.InferOutput<typeof JobDetailSchema>;
