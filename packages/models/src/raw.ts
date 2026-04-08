import { Schema } from "effect";

// ── Raw フィールドスキーマ（brand なし、バリデーションあり） ──

const ISO8601 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export const RawJobNumber = Schema.String.pipe(
  Schema.pattern(/^\d{5}-\d{0,8}$/),
);

export const RawEstablishmentNumber = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{6}-\d$/),
);

export const RawCorporateNumber = Schema.String.pipe(
  Schema.pattern(/^\d{13}$/),
);

export const RawReceivedDate = Schema.String.pipe(Schema.pattern(ISO8601));

export const RawExpiryDate = Schema.String.pipe(Schema.pattern(ISO8601));

export const RawHomePageUrl = Schema.String.pipe(
  Schema.filter((s) => URL.canParse(s), {
    message: () => "有効なURLではありません",
  }),
);

export const RawEmploymentType = Schema.Union(
  Schema.Literal("正社員"),
  Schema.Literal("パート労働者"),
  Schema.Literal("正社員以外"),
  Schema.Literal("有期雇用派遣労働者"),
);

export const RawJobCategory = Schema.Union(
  Schema.Literal("フルタイム"),
  Schema.Literal("一般フルタイム"),
  Schema.Literal("パート"),
  Schema.Literal("新卒・既卒求人"),
  Schema.Literal("季節求人"),
  Schema.Literal("出稼ぎ求人"),
  Schema.Literal("障害のある方のための求人"),
);

export const RawWageType = Schema.Union(
  Schema.Literal("月給"),
  Schema.Literal("時給"),
  Schema.Literal("日給"),
);

export const RawWage = Schema.NonNegativeInt;

export const RawWageRange = Schema.Struct({
  min: RawWage,
  max: RawWage,
});

export const RawWorkingTime = Schema.String.pipe(
  Schema.pattern(/^\d{2}:\d{2}:\d{2}$/),
);

export const RawWorkingHours = Schema.Struct({
  start: Schema.NullOr(RawWorkingTime),
  end: Schema.NullOr(RawWorkingTime),
});

export const RawEmployeeCount = Schema.NonNegativeInt;

// ── Raw ドメインモデル（brand なし） ──

export const RawCompany = Schema.Struct({
  establishmentNumber: Schema.String,
  companyName: Schema.NullOr(Schema.String),
  postalCode: Schema.NullOr(Schema.String),
  address: Schema.NullOr(Schema.String),
  employeeCount: Schema.NullOr(Schema.Number),
  foundedYear: Schema.NullOr(Schema.String),
  capital: Schema.NullOr(Schema.String),
  businessDescription: Schema.NullOr(Schema.String),
  corporateNumber: Schema.NullOr(Schema.String),
});
export type RawCompany = typeof RawCompany.Type;

export const RawJob = Schema.Struct({
  // 基本情報
  jobNumber: Schema.String,
  companyName: Schema.NullOr(Schema.String),
  receivedDate: Schema.String,
  expiryDate: Schema.String,
  homePage: Schema.NullOr(Schema.String),
  occupation: Schema.String,
  employmentType: Schema.String,
  wage: Schema.NullOr(RawWageRange),
  workingHours: Schema.NullOr(RawWorkingHours),
  employeeCount: Schema.NullOr(Schema.Number),
  workPlace: Schema.NullOr(Schema.String),
  jobDescription: Schema.NullOr(Schema.String),
  qualifications: Schema.NullOr(Schema.String),
  // 求人情報
  establishmentNumber: Schema.NullOr(Schema.String),
  jobCategory: Schema.NullOr(Schema.String),
  industryClassification: Schema.NullOr(Schema.String),
  publicEmploymentOffice: Schema.NullOr(Schema.String),
  onlineApplicationAccepted: Schema.NullOr(Schema.Boolean),
  // 仕事内容
  dispatchType: Schema.NullOr(Schema.String),
  employmentPeriod: Schema.NullOr(Schema.String),
  ageRequirement: Schema.NullOr(Schema.String),
  education: Schema.NullOr(Schema.String),
  requiredExperience: Schema.NullOr(Schema.String),
  trialPeriod: Schema.NullOr(Schema.String),
  carCommute: Schema.NullOr(Schema.String),
  transferPossibility: Schema.NullOr(Schema.String),
  // 賃金
  wageType: Schema.NullOr(Schema.String),
  raise: Schema.NullOr(Schema.String),
  bonus: Schema.NullOr(Schema.String),
  // その他条件
  insurance: Schema.NullOr(Schema.String),
  retirementBenefit: Schema.NullOr(Schema.String),
});
export type RawJob = typeof RawJob.Type;
