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

export const EmployeeCount = Schema.Number.pipe(Schema.brand("EmployeeCount"));
export type EmployeeCount = typeof EmployeeCount.Type;

// ── ユーティリティ型 ──

/**
 * ブランデッド型を再帰的に剥がし、JSON シリアライズ後の plain 型を返す。
 * Hono RPC の `res.json()` レスポンス型と合致させるために使う。
 * Kysely の `Selectable<T>` に類似。
 *
 * @example
 * ```ts
 * type PlainJob = Unbrand<Job>;
 * // { readonly jobNumber: string; readonly companyName: string; ... }
 * ```
 */
export type Unbrand<T> = T extends null
  ? null
  : T extends undefined
    ? undefined
    : T extends readonly (infer U)[]
      ? Unbrand<U>[]
      : T extends string
        ? string
        : T extends number
          ? number
          : T extends boolean
            ? boolean
            : T extends object
              ? { [K in keyof T]: Unbrand<T[K]> }
              : T;

// ── ドメインモデル ──

export const Job = Schema.Struct({
  jobNumber: JobNumber,
  companyName: Schema.String,
  receivedDate: ReceivedDate,
  expiryDate: ExpiryDate,
  homePage: Schema.NullOr(HomePageUrl),
  occupation: Schema.String,
  employmentType: EmploymentType,
  wage: WageRange,
  workingHours: WorkingHours,
  employeeCount: EmployeeCount,
  workPlace: Schema.NullOr(Schema.String),
  jobDescription: Schema.NullOr(Schema.String),
  qualifications: Schema.NullOr(Schema.String),
});
export type Job = typeof Job.Type;
