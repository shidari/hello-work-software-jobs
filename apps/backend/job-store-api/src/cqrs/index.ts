import type { createD1DB } from "@sho/db";
import type { Job as DomainJobType } from "@sho/models";
import { Context, Schema } from "effect";

// --- DB 注入 ---

export type KyselyD1Client = ReturnType<typeof createD1DB>;

export class JobStoreDB extends Context.Tag("JobStoreDB")<
  JobStoreDB,
  KyselyD1Client
>() {}

// --- スキーマ ---

// DB行（フラット構造）
const DbJobRowSchema = Schema.Struct({
  jobNumber: Schema.String,
  companyName: Schema.NullOr(Schema.String),
  receivedDate: Schema.String,
  expiryDate: Schema.String,
  homePage: Schema.NullOr(Schema.String),
  occupation: Schema.String,
  employmentType: Schema.String,
  wageMin: Schema.NullOr(Schema.Number),
  wageMax: Schema.NullOr(Schema.Number),
  workingStartTime: Schema.NullOr(Schema.String),
  workingEndTime: Schema.NullOr(Schema.String),
  employeeCount: Schema.NullOr(Schema.Number),
  workPlace: Schema.NullOr(Schema.String),
  jobDescription: Schema.NullOr(Schema.String),
  qualifications: Schema.NullOr(Schema.String),
  status: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

// ドメインモデル（ネスト構造）
const JobSchema = Schema.Struct({
  jobNumber: Schema.String,
  companyName: Schema.NullOr(Schema.String),
  receivedDate: Schema.String,
  expiryDate: Schema.String,
  homePage: Schema.NullOr(Schema.String),
  occupation: Schema.String,
  employmentType: Schema.String,
  wage: Schema.NullOr(
    Schema.Struct({ min: Schema.Number, max: Schema.Number }),
  ),
  workingHours: Schema.NullOr(
    Schema.Struct({
      start: Schema.NullOr(Schema.String),
      end: Schema.NullOr(Schema.String),
    }),
  ),
  employeeCount: Schema.NullOr(Schema.Number),
  workPlace: Schema.NullOr(Schema.String),
  jobDescription: Schema.NullOr(Schema.String),
  qualifications: Schema.NullOr(Schema.String),
  status: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

// DB行 ↔ ドメインモデル の変換
export const DbJobSchema = Schema.transform(DbJobRowSchema, JobSchema, {
  strict: true,
  decode: (row) => ({
    jobNumber: row.jobNumber,
    companyName: row.companyName,
    receivedDate: row.receivedDate,
    expiryDate: row.expiryDate,
    homePage: row.homePage,
    occupation: row.occupation,
    employmentType: row.employmentType,
    wage:
      row.wageMin != null && row.wageMax != null
        ? { min: row.wageMin, max: row.wageMax }
        : null,
    workingHours:
      row.workingStartTime != null || row.workingEndTime != null
        ? { start: row.workingStartTime, end: row.workingEndTime }
        : null,
    employeeCount: row.employeeCount,
    workPlace: row.workPlace,
    jobDescription: row.jobDescription,
    qualifications: row.qualifications,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }),
  encode: (job) => ({
    jobNumber: job.jobNumber,
    companyName: job.companyName,
    receivedDate: job.receivedDate,
    expiryDate: job.expiryDate,
    homePage: job.homePage,
    occupation: job.occupation,
    employmentType: job.employmentType,
    wageMin: job.wage?.min ?? null,
    wageMax: job.wage?.max ?? null,
    workingStartTime: job.workingHours?.start ?? null,
    workingEndTime: job.workingHours?.end ?? null,
    employeeCount: job.employeeCount,
    workPlace: job.workPlace,
    jobDescription: job.jobDescription,
    qualifications: job.qualifications,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }),
});

// --- 型定義 ---

export type Job = typeof DbJobSchema.Type;

export type SearchFilter = {
  companyName?: string;
  employeeCountLt?: number;
  employeeCountGt?: number;
  jobDescription?: string;
  jobDescriptionExclude?: string;
  onlyNotExpired?: boolean;
  orderByReceiveDate?: "asc" | "desc";
  addedSince?: string;
  addedUntil?: string;
};

export type InsertJobRequestBody = DomainJobType;
