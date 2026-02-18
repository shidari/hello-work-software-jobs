import { Schema } from "effect";

export const jobNumberSchema = Schema.String.pipe(
  Schema.pattern(/^\d{5}-\d{0,8}$/),
  Schema.brand("jobNumber"),
).annotations({
  identifier: "JobNumber",
  title: "求人番号",
  description: "ハローワーク求人番号。形式: 5桁-0〜8桁（例: 13010-12345678）",
});

export type JobNumber = typeof jobNumberSchema.Type;

export const job = Schema.Struct({
  id: Schema.Number.annotations({ description: "内部ID（自動採番）" }),
  jobNumber: Schema.String.annotations({ description: "ハローワーク求人番号" }),
  companyName: Schema.String.annotations({ description: "事業所名" }),
  receivedDate: Schema.String.annotations({
    description: "受理日（ISO 8601形式）",
  }),
  expiryDate: Schema.String.annotations({
    description: "有効期限日（ISO 8601形式）",
  }),
  homePage: Schema.NullOr(Schema.String).annotations({
    description: "事業所ホームページURL",
  }),
  occupation: Schema.String.annotations({ description: "職種" }),
  employmentType: Schema.String.annotations({
    description: "雇用形態（正社員, パート労働者 等）",
  }),
  wageMin: Schema.Number.annotations({ description: "賃金下限（円）" }),
  wageMax: Schema.Number.annotations({ description: "賃金上限（円）" }),
  workingStartTime: Schema.NullOr(Schema.String).annotations({
    description: "就業開始時刻（HH:MM:SS）",
  }),
  workingEndTime: Schema.NullOr(Schema.String).annotations({
    description: "就業終了時刻（HH:MM:SS）",
  }),
  employeeCount: Schema.Number.annotations({
    description: "企業全体の従業員数",
  }),
  workPlace: Schema.NullOr(Schema.String).annotations({
    description: "就業場所",
  }),
  jobDescription: Schema.NullOr(Schema.String).annotations({
    description: "仕事の内容",
  }),
  qualifications: Schema.NullOr(Schema.String).annotations({
    description: "必要な経験・資格等",
  }),
  status: Schema.String.annotations({ description: "求人ステータス" }),
  createdAt: Schema.String.annotations({
    description: "レコード作成日時（ISO 8601）",
  }),
  updatedAt: Schema.String.annotations({
    description: "レコード更新日時（ISO 8601）",
  }),
}).annotations({
  identifier: "Job",
  title: "ハローワーク求人",
  description:
    "ハローワーク（公共職業安定所）の求人情報エンティティ。DBカラムと1:1対応。",
});

export type Job = typeof job.Type;
