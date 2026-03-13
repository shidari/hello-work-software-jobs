import type { Job } from "@sho/models";
import { Job as JobSchema } from "@sho/models";

/**
 * ブランデッド型を再帰的に剥がし、JSON シリアライズ後の plain 型を返す。
 * Hono RPC の `res.json()` レスポンス型と合致させるために使う。
 */
type Unbrand<T> = T extends null
  ? null
  : T extends undefined
    ? undefined
    : T extends readonly (infer U)[]
      ? Unbrand<U>[]
      : T extends string
        ? string
        : T extends number
          ? number
          : T extends boolean
            ? boolean
            : T extends object
              ? { [K in keyof T]: Unbrand<T[K]> }
              : T;

export const JobOverviewSchema = JobSchema.pick(
  "jobNumber",
  "companyName",
  "occupation",
  "employmentType",
  "workPlace",
  "employeeCount",
  "receivedDate",
);

export type JobOverview = Unbrand<typeof JobOverviewSchema.Type>;

export type JobDetail = Unbrand<Job>;

export type JobList = JobDetail[];
