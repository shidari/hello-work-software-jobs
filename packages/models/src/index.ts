import { Schema } from "effect";

export {
  RawCompany,
  RawCorporateNumber,
  RawEmployeeCount,
  RawEmploymentType,
  RawEstablishmentNumber,
  RawExpiryDate,
  RawHomePageUrl,
  RawJob,
  RawJobCategory,
  RawJobNumber,
  RawReceivedDate,
  RawWage,
  RawWageRange,
  RawWageType,
  RawWorkingHours,
  RawWorkingTime,
} from "./raw";

import {
  RawCorporateNumber,
  RawEmployeeCount,
  RawEmploymentType,
  RawEstablishmentNumber,
  RawExpiryDate,
  RawHomePageUrl,
  RawJobCategory,
  RawJobNumber,
  RawReceivedDate,
  RawWage,
  RawWageType,
  RawWorkingTime,
} from "./raw";

// ── ドメインフィールドスキーマ（branded） ──

export const JobNumber = RawJobNumber.pipe(
  Schema.brand("jobNumber"),
).annotations({
  identifier: "JobNumber",
  title: "求人番号",
  description: "ハローワーク求人番号。形式: 5桁-0〜8桁（例: 13010-12345678）",
});
export type JobNumber = typeof JobNumber.Type;

export const EstablishmentNumber = RawEstablishmentNumber.pipe(
  Schema.brand("EstablishmentNumber"),
).annotations({
  identifier: "EstablishmentNumber",
  title: "事業所番号",
  description: "ハローワーク事業所番号。形式: 4桁-6桁-1桁（例: 0101-626495-7）",
});
export type EstablishmentNumber = typeof EstablishmentNumber.Type;

export const CorporateNumber = RawCorporateNumber.pipe(
  Schema.brand("CorporateNumber"),
).annotations({
  identifier: "CorporateNumber",
  title: "法人番号",
  description: "国税庁法人番号。13桁の数字（例: 9430001008073）",
});
export type CorporateNumber = typeof CorporateNumber.Type;

export const ReceivedDate = RawReceivedDate.pipe(Schema.brand("ReceivedDate"));
export type ReceivedDate = typeof ReceivedDate.Type;

export const ExpiryDate = RawExpiryDate.pipe(Schema.brand("ExpiryDate"));
export type ExpiryDate = typeof ExpiryDate.Type;

export const HomePageUrl = RawHomePageUrl.pipe(Schema.brand("HomePageUrl"));
export type HomePageUrl = typeof HomePageUrl.Type;

export const EmploymentType = RawEmploymentType.pipe(
  Schema.brand("EmploymentType"),
).annotations({
  identifier: "EmploymentType",
  title: "雇用形態",
  description: "ハローワーク求人に記載される雇用形態の種別",
});
export type EmploymentType = typeof EmploymentType.Type;

export const JobCategory = RawJobCategory.pipe(
  Schema.brand("JobCategory"),
).annotations({
  identifier: "JobCategory",
  title: "求人区分",
  description: "ハローワーク求人の区分",
});
export type JobCategory = typeof JobCategory.Type;

export const WageType = RawWageType.pipe(Schema.brand("WageType")).annotations({
  identifier: "WageType",
  title: "賃金形態",
  description: "賃金の支払形態",
});
export type WageType = typeof WageType.Type;

export const Wage = RawWage.pipe(Schema.brand("Wage"));
export type Wage = typeof Wage.Type;

export const WageRange = Schema.Struct({
  min: Wage,
  max: Wage,
});
export type WageRange = typeof WageRange.Type;

export const WorkingTime = RawWorkingTime.pipe(
  Schema.brand("WorkingTime"),
).annotations({
  identifier: "WorkingTime",
  title: "勤務時間",
  description: "HH:MM:SS 形式の時刻（例: 09:00:00）",
});
export type WorkingTime = typeof WorkingTime.Type;

export const WorkingHours = Schema.Struct({
  start: Schema.NullOr(WorkingTime),
  end: Schema.NullOr(WorkingTime),
});
export type WorkingHours = typeof WorkingHours.Type;

export const EmployeeCount = RawEmployeeCount.pipe(
  Schema.brand("EmployeeCount"),
);
export type EmployeeCount = typeof EmployeeCount.Type;

// ── ドメインモデル: Company（branded） ──

export const Company = Schema.Struct({
  establishmentNumber: EstablishmentNumber,
  companyName: Schema.NullOr(Schema.String),
  postalCode: Schema.NullOr(Schema.String),
  address: Schema.NullOr(Schema.String),
  employeeCount: Schema.NullOr(EmployeeCount),
  foundedYear: Schema.NullOr(Schema.String),
  capital: Schema.NullOr(Schema.String),
  businessDescription: Schema.NullOr(Schema.String),
  corporateNumber: Schema.NullOr(CorporateNumber),
}).annotations({
  identifier: "Company",
  title: "事業所",
  description: "ハローワークに登録された事業所情報",
});
export type Company = typeof Company.Type;

// ── ドメインモデル: Job（branded） ──

export const Job = Schema.Struct({
  // --- 基本情報 ---
  jobNumber: JobNumber,
  companyName: Schema.NullOr(Schema.String),
  receivedDate: ReceivedDate,
  expiryDate: ExpiryDate,
  homePage: Schema.NullOr(HomePageUrl),
  occupation: Schema.String,
  employmentType: EmploymentType,
  wage: Schema.NullOr(WageRange),
  workingHours: Schema.NullOr(WorkingHours),
  employeeCount: Schema.NullOr(EmployeeCount),
  workPlace: Schema.NullOr(Schema.String),
  jobDescription: Schema.NullOr(Schema.String),
  qualifications: Schema.NullOr(Schema.String),

  // --- 求人情報 ---
  establishmentNumber: Schema.NullOr(EstablishmentNumber),
  jobCategory: Schema.NullOr(JobCategory),
  industryClassification: Schema.NullOr(Schema.String),
  publicEmploymentOffice: Schema.NullOr(Schema.String),
  onlineApplicationAccepted: Schema.NullOr(Schema.Boolean),

  // --- 仕事内容 ---
  dispatchType: Schema.NullOr(Schema.String),
  employmentPeriod: Schema.NullOr(Schema.String),
  ageRequirement: Schema.NullOr(Schema.String),
  education: Schema.NullOr(Schema.String),
  requiredExperience: Schema.NullOr(Schema.String),
  trialPeriod: Schema.NullOr(Schema.String),
  carCommute: Schema.NullOr(Schema.String),
  transferPossibility: Schema.NullOr(Schema.String),

  // --- 賃金 ---
  wageType: Schema.NullOr(WageType),
  raise: Schema.NullOr(Schema.String),
  bonus: Schema.NullOr(Schema.String),

  // --- その他条件 ---
  insurance: Schema.NullOr(Schema.String),
  retirementBenefit: Schema.NullOr(Schema.String),
});
export type Job = typeof Job.Type;
