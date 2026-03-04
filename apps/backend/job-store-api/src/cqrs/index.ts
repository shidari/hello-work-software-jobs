import { type createD1DB, DbJobRowSchema } from "@sho/db";
import { Context, Schema } from "effect";

// --- DB行 ↔ ドメインモデル 変換スキーマ ---

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

export type Job = typeof DbJobSchema.Type;

// --- DB 注入 ---

export type KyselyD1Client = ReturnType<typeof createD1DB>;

export class JobStoreDB extends Context.Tag("JobStoreDB")<
  JobStoreDB,
  KyselyD1Client
>() {}

// --- 型定義 ---

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
