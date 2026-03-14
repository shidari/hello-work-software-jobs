import {
  type createD1DB,
  DbCompanyRowSchema,
  DbJobRowSchema,
} from "@sho/db";
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
  // 新規フィールド
  establishmentNumber: Schema.NullOr(Schema.String),
  jobCategory: Schema.NullOr(Schema.String),
  industryClassification: Schema.NullOr(Schema.String),
  publicEmploymentOffice: Schema.NullOr(Schema.String),
  onlineApplicationAccepted: Schema.NullOr(Schema.Boolean),
  dispatchType: Schema.NullOr(Schema.String),
  employmentPeriod: Schema.NullOr(Schema.String),
  ageRequirement: Schema.NullOr(Schema.String),
  education: Schema.NullOr(Schema.String),
  requiredExperience: Schema.NullOr(Schema.String),
  trialPeriod: Schema.NullOr(Schema.String),
  carCommute: Schema.NullOr(Schema.String),
  transferPossibility: Schema.NullOr(Schema.String),
  wageType: Schema.NullOr(Schema.String),
  raise: Schema.NullOr(Schema.String),
  bonus: Schema.NullOr(Schema.String),
  insurance: Schema.NullOr(Schema.String),
  retirementBenefit: Schema.NullOr(Schema.String),
  // システム
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
    onlineApplicationAccepted:
      row.onlineApplicationAccepted != null
        ? row.onlineApplicationAccepted === 1
        : null,
    // 新規フィールド（パススルー）
    establishmentNumber: row.establishmentNumber ?? null,
    jobCategory: row.jobCategory ?? null,
    industryClassification: row.industryClassification ?? null,
    publicEmploymentOffice: row.publicEmploymentOffice ?? null,
    dispatchType: row.dispatchType ?? null,
    employmentPeriod: row.employmentPeriod ?? null,
    ageRequirement: row.ageRequirement ?? null,
    education: row.education ?? null,
    requiredExperience: row.requiredExperience ?? null,
    trialPeriod: row.trialPeriod ?? null,
    carCommute: row.carCommute ?? null,
    transferPossibility: row.transferPossibility ?? null,
    wageType: row.wageType ?? null,
    raise: row.raise ?? null,
    bonus: row.bonus ?? null,
    insurance: row.insurance ?? null,
    retirementBenefit: row.retirementBenefit ?? null,
    // システム
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
    onlineApplicationAccepted:
      job.onlineApplicationAccepted != null
        ? job.onlineApplicationAccepted
          ? 1
          : 0
        : null,
    // 新規フィールド（パススルー）
    establishmentNumber: job.establishmentNumber ?? null,
    jobCategory: job.jobCategory ?? null,
    industryClassification: job.industryClassification ?? null,
    publicEmploymentOffice: job.publicEmploymentOffice ?? null,
    dispatchType: job.dispatchType ?? null,
    employmentPeriod: job.employmentPeriod ?? null,
    ageRequirement: job.ageRequirement ?? null,
    education: job.education ?? null,
    requiredExperience: job.requiredExperience ?? null,
    trialPeriod: job.trialPeriod ?? null,
    carCommute: job.carCommute ?? null,
    transferPossibility: job.transferPossibility ?? null,
    wageType: job.wageType ?? null,
    raise: job.raise ?? null,
    bonus: job.bonus ?? null,
    insurance: job.insurance ?? null,
    retirementBenefit: job.retirementBenefit ?? null,
    // システム
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }),
});

export type Job = typeof DbJobSchema.Type;

// --- Company スキーマ ---

const CompanySchema = Schema.Struct({
  establishmentNumber: Schema.String,
  companyName: Schema.NullOr(Schema.String),
  postalCode: Schema.NullOr(Schema.String),
  address: Schema.NullOr(Schema.String),
  employeeCount: Schema.NullOr(Schema.Number),
  foundedYear: Schema.NullOr(Schema.String),
  capital: Schema.NullOr(Schema.String),
  businessDescription: Schema.NullOr(Schema.String),
  corporateNumber: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const DbCompanySchema = Schema.transform(
  DbCompanyRowSchema,
  CompanySchema,
  {
    strict: true,
    decode: (row) => ({ ...row }),
    encode: (company) => ({ ...company }),
  },
);

export type Company = typeof DbCompanySchema.Type;

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
  occupation?: string;
  employmentType?: string;
  wageMin?: number;
  wageMax?: number;
  workPlace?: string;
  qualifications?: string;
  jobCategory?: string;
  wageType?: string;
  education?: string;
  industryClassification?: string;
};
