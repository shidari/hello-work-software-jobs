import { number, object, string } from "valibot";
import { searchFilterSchema } from "../dbClient";

export const jobListContinueQuerySchema = object({
  nextToken: string(),
});

export const cursorSchema = object({
  jobId: number(),
  receivedDateByISOString: string(),
});

export const decodedNextTokenSchema = object({
  iss: string(),
  iat: number(),
  nbf: number(),
  exp: number(),
  cursor: cursorSchema,
  filter: searchFilterSchema,
});

export const jobListContinueClientErrorResponseSchema = object({
  message: string(),
});

export const jobListContinueServerErrorSchema = object({
  message: string(),
});
