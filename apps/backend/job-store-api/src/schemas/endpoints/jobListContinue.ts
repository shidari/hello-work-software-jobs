import { Schema } from "effect";
import { searchFilterSchema } from "../dbClient";

export const jobListContinueQuerySchema = Schema.Struct({
  nextToken: Schema.String,
});

export const decodedNextTokenSchema = Schema.Struct({
  iss: Schema.String,
  iat: Schema.Number,
  nbf: Schema.Number,
  exp: Schema.Number,
  page: Schema.Number,
  filter: searchFilterSchema,
});

export const jobListContinueClientErrorResponseSchema = Schema.Struct({
  message: Schema.String,
});

export const jobListContinueServerErrorSchema = Schema.Struct({
  message: Schema.String,
});
