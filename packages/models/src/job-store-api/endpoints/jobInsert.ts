import { literal, number, object, omit, pipe, regex, string } from "valibot";
import { ISO8601, unbrandedScrapedJobSchema } from "../tmp";

export const insertJobRequestBodySchema = object({
  ...omit(unbrandedScrapedJobSchema, ["wage", "workingHours"]).entries,
  wageMin: number(),
  wageMax: number(),
  workingStartTime: string(),
  workingEndTime: string(),
  receivedDate: pipe(string(), regex(ISO8601)),
  expiryDate: pipe(string(), regex(ISO8601)),
  employeeCount: number(),
});

export const insertJobResponseBodySchema = object({
  ...insertJobRequestBodySchema.entries,
  createdAt: pipe(string(), regex(ISO8601)), // 必要なら pipe(string(), regex(ISO8601))
  updatedAt: pipe(string(), regex(ISO8601)),
  status: string(),
});

// API レスポンス用スキーマ
export const insertJobSuccessResponseSchema = object({
  success: literal(true),
  result: object({
    job: insertJobResponseBodySchema,
  }),
});

export const insertJobClientErrorResponseSchema = object({
  message: string(),
});

export const insertJobServerErrorResponseSchema = object({
  message: string(),
});
