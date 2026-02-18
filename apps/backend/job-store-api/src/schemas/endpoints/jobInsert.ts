import { job } from "@sho/models";
import { Schema } from "effect";

// ドメインモデルから id, status, timestamps を除いた insert 用スキーマ
const { id, status, createdAt, updatedAt, ...insertFields } = job.fields;
export const insertJobRequestBodySchema = Schema.Struct({ ...insertFields });

// API レスポンス用スキーマ
export const insertJobSuccessResponseSchema = Schema.Struct({
  success: Schema.Literal(true),
  result: Schema.Struct({
    job: insertJobRequestBodySchema,
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
