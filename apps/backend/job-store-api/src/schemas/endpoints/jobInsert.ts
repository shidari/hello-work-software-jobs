import { job } from "@sho/models";
import { literal, object, string } from "valibot";

// ドメインモデルから id, status, timestamps を除いた insert 用スキーマ
const { id, status, createdAt, updatedAt, ...insertFields } = job.entries;
export const insertJobRequestBodySchema = object({ ...insertFields });

// API レスポンス用スキーマ
export const insertJobSuccessResponseSchema = object({
  success: literal(true),
  result: object({
    job: insertJobRequestBodySchema,
  }),
});

export const insertJobDuplicationErrorResponseSchema = object({
  message: string(),
});

export const insertJobGeneralClientErrorResponseSchema = object({
  message: string(),
});

export const insertJobServerErrorResponseSchema = object({
  message: string(),
});
