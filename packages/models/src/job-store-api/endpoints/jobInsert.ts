import { literal, object, string } from "valibot";
import { transformedSchema } from "../../headless-crawler/transformer";

export const insertJobRequestBodySchema = transformedSchema;

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
