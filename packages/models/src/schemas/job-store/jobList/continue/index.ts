import { number, object, string } from "valibot";
import { jobListSearchFilterSchema } from "..";

export const jobListContinueQuerySchema = object({
  nextToken: string(),
});

export const cursorSchema = object({
  jobId: number(),
  receivedDateByISOString: string(),
});

export const decodedNextTokenSchema = object({
  exp: number(),
  cursor: cursorSchema,
  filter: jobListSearchFilterSchema,
});

export const jobListContinueClientErrorResponseSchema = object({
  message: string(),
});

export const jobListContinueServerErrorSchema = object({
  message: string(),
});
