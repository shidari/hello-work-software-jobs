import type * as v from "valibot";
import type {
  JobDetailSchema,
  JobOverviewSchema,
} from "../../schemas/frontend";

export type TJobOverview = v.InferOutput<typeof JobOverviewSchema>;
export type TJobDetail = v.InferOutput<typeof JobDetailSchema>;
