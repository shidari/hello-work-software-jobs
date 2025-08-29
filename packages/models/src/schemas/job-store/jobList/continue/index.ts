import { number, object, string } from "valibot";
import { jobListSearchFilterSchema } from "..";

export const jobListContinueQuerySchema = object({
  nextToken: string(),
});

export const decodedNextTokenSchema = object({
  exp: number(),
  cursor: object({
    jobId: number(),
  }),
  filter: jobListSearchFilterSchema,
});

export const jobListContinueClientErrorResponseSchema = object({
  message: string(),
});

export const jobListContinueServerErrorSchema = object({
  message: string(),
});
