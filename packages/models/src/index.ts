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

export const EstablishmentNumber = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{6}-\d$/),
  Schema.brand("EstablishmentNumber"),
).annotations({
  identifier: "EstablishmentNumber",
  title: "事業所番号",
  description:
    "ハローワーク事業所番号。形式: 4桁-6桁-1桁（例: 0101-626495-7）",
});
export type EstablishmentNumber = typeof EstablishmentNumber.Type;

export const CorporateNumber = Schema.String.pipe(
  Schema.pattern(/^\d{13}$/),
  Schema.brand("CorporateNumber"),
).annotations({
  identifier: "CorporateNumber",
  title: "法人番号",
  description: "国税庁法人番号。13桁の数字（例: 9430001008073）",
});
export type CorporateNumber = typeof CorporateNumber.Type;

export const ReceivedDate = Schema.String.pipe(
  Schema.pattern(ISO8601),
  Schema.brand("ReceivedDate"),
);
export type ReceivedDate = typeof ReceivedDate.Type;

export const ExpiryDate = Schema.String.pipe(
  Schema.pattern(ISO8601),
  Schema.brand("ExpiryDate"),
);
export type ExpiryDate = typeof ExpiryDate.Type;

export const HomePageUrl = Schema.String.pipe(
  Schema.filter((s) => URL.canParse(s), {
    message: () => "有効なURLではありません",
  }),
  Schema.brand("HomePageUrl"),
);
export type HomePageUrl = typeof HomePageUrl.Type;

export const EmploymentType = Schema.Union(
  Schema.Literal("正社員"),
  Schema.Literal("パート労働者"),
  Schema.Literal("正社員以外"),
  Schema.Literal("有期雇用派遣労働者"),
)
  .pipe(Schema.brand("EmploymentType"))
  .annotations({
    identifier: "EmploymentType",
    title: "雇用形態",
    description: "ハローワーク求人に記載される雇用形態の種別",
  });
export type EmploymentType = typeof EmploymentType.Type;

export const JobCategory = Schema.Union(
  Schema.Literal("フルタイム"),
  Schema.Literal("一般フルタイム"),
  Schema.Literal("パート"),
  Schema.Literal("新卒・既卒求人"),
  Schema.Literal("季節求人"),
  Schema.Literal("出稼ぎ求人"),
  Schema.Literal("障害のある方のための求人"),
)
  .pipe(Schema.brand("JobCategory"))
  .annotations({
    identifier: "JobCategory",
    title: "求人区分",
    description: "ハローワーク求人の区分",
  });
export type JobCategory = typeof JobCategory.Type;

export const WageType = Schema.Union(
  Schema.Literal("月給"),
  Schema.Literal("時給"),
  Schema.Literal("日給"),
)
  .pipe(Schema.brand("WageType"))
  .annotations({
    identifier: "WageType",
    title: "賃金形態",
    description: "賃金の支払形態",
  });
export type WageType = typeof WageType.Type;

export const Wage = Schema.Number.pipe(Schema.brand("Wage"));
export type Wage = typeof Wage.Type;

export const WageRange = Schema.Struct({
  min: Wage,
  max: Wage,
});
export type WageRange = typeof WageRange.Type;

export const WorkingTime = Schema.String.pipe(Schema.brand("WorkingTime"));
export type WorkingTime = typeof WorkingTime.Type;

export const WorkingHours = Schema.Struct({
  start: Schema.NullOr(WorkingTime),
  end: Schema.NullOr(WorkingTime),
});
export type WorkingHours = typeof WorkingHours.Type;

export const EmployeeCount = Schema.Number.pipe(
  Schema.brand("EmployeeCount"),
);
export type EmployeeCount = typeof EmployeeCount.Type;

// ── ドメインモデル: Company ──

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

// ── ドメインモデル: Job ──

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
