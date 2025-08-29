import { brand, object, pipe, regex, string } from "valibot";

const jobNumberSchema = pipe(
  string(),
  regex(/^\d{5}-\d{0,8}$/, "jobNumber format invalid."),
  brand("jobNumber"),
);

import { jobSelectSchema } from "./drizzle";

export const jobFetchParamSchema = object({
  jobNumber: jobNumberSchema,
});

// Valibotでomitはスプレッドで除外
const { id: _, ...jobSelectSchemaWithoutId } = jobSelectSchema.entries;
export const JobSchema = object({ ...jobSelectSchemaWithoutId });

export const jobFetchSuccessResponseSchema = JobSchema;

export const jobFetchClientErrorResponseSchema = object({
  message: string(),
});

export const jobFetchServerErrorSchema = object({
  message: string(),
});
