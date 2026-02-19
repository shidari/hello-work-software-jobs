import { JobNumber } from "@sho/models";
import { Schema } from "effect";
import { JobSchema } from "../dbClient";

export const jobFetchParamSchema = Schema.Struct({
  jobNumber: JobNumber,
});

export const jobFetchSuccessResponseSchema = JobSchema;

export const jobFetchClientErrorResponseSchema = Schema.Struct({
  message: Schema.String,
});

export const jobFetchServerErrorSchema = Schema.Struct({
  message: Schema.String,
});
