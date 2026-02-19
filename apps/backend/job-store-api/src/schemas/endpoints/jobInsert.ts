import { Job } from "@sho/models";
import { Schema } from "effect";

export const insertJobRequestBodySchema = Job;

// API レスポンス用スキーマ
export const insertJobSuccessResponseSchema = Schema.Struct({
  success: Schema.Literal(true),
  result: Schema.Struct({
    job: Job,
  }),
});

export const insertJobDuplicationErrorResponseSchema = Schema.Struct({
  message: Schema.String,
});

export const insertJobGeneralClientErrorResponseSchema = Schema.Struct({
  message: Schema.String,
});

export const insertJobServerErrorResponseSchema = Schema.Struct({
  message: Schema.String,
});
