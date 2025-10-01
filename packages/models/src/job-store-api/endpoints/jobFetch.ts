import { object, string } from "valibot";
import { JobSchema } from "../dbClient";
import { jobNumberSchema } from "../../headless-crawler";

export const jobFetchParamSchema = object({
  jobNumber: jobNumberSchema,
});

export const jobFetchSuccessResponseSchema = JobSchema;

export const jobFetchClientErrorResponseSchema = object({
  message: string(),
});

export const jobFetchServerErrorSchema = object({
  message: string(),
});
