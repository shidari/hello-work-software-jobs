import { Schema } from "effect";

// ── ドメインフィールドスキーマ ──

const ISO8601 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export const JobNumber = Schema.String.pipe(
  Schema.pattern(/^\d{5}-\d{0,8}$/),
  Schema.brand("jobNumber"),
).annotations({
  identifier: "JobNumber",
  title: "求人番号",
  description: "ハローワーク求人番号。形式: 5桁-0〜8桁（例: 13010-12345678）",
});
export type JobNumber = typeof JobNumber.Type;

export const ISODate = Schema.String.pipe(
  Schema.pattern(ISO8601),
  Schema.brand("ISODate"),
);
export type ISODate = typeof ISODate.Type;

export const HomePageUrl = Schema.String.pipe(
  Schema.filter((s) => URL.canParse(s), {
    message: () => "有効なURLではありません",
  }),
  Schema.brand("HomePageUrl"),
);
export type HomePageUrl = typeof HomePageUrl.Type;

export const EmploymentTypeValue = Schema.Union(
  Schema.Literal("正社員"),
  Schema.Literal("パート労働者"),
  Schema.Literal("正社員以外"),
  Schema.Literal("有期雇用派遣労働者"),
)
  .pipe(Schema.brand("EmploymentTypeValue"))
  .annotations({
    identifier: "EmploymentTypeValue",
    title: "雇用形態",
    description: "ハローワーク求人に記載される雇用形態の種別",
  });
export type EmploymentTypeValue = typeof EmploymentTypeValue.Type;

export const Wage = Schema.Number.pipe(Schema.brand("Wage"));
export type Wage = typeof Wage.Type;

export const WorkingTime = Schema.String.pipe(Schema.brand("WorkingTime"));
export type WorkingTime = typeof WorkingTime.Type;

export const EmployeeCount = Schema.Number.pipe(Schema.brand("EmployeeCount"));
export type EmployeeCount = typeof EmployeeCount.Type;

// ── ドメインモデル ──

export const Job = Schema.Struct({
  jobNumber: JobNumber,
  companyName: Schema.String,
  receivedDate: ISODate,
  expiryDate: ISODate,
  homePage: Schema.NullOr(HomePageUrl),
  occupation: Schema.String,
  employmentType: EmploymentTypeValue,
  wageMin: Wage,
  wageMax: Wage,
  workingStartTime: Schema.NullOr(WorkingTime),
  workingEndTime: Schema.NullOr(WorkingTime),
  employeeCount: EmployeeCount,
  workPlace: Schema.NullOr(Schema.String),
  jobDescription: Schema.NullOr(Schema.String),
  qualifications: Schema.NullOr(Schema.String),
});
export type Job = typeof Job.Type;
