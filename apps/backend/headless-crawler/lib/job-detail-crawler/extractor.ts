import { Schema } from "effect";

// ── RawJob スキーマ: DOM から抽出した生テキスト ──

export const RawJob = Schema.Struct({
  jobNumber: Schema.optional(Schema.String),
  companyName: Schema.optional(Schema.String),
  receivedDate: Schema.optional(Schema.String),
  expiryDate: Schema.optional(Schema.String),
  homePage: Schema.NullOr(Schema.String),
  occupation: Schema.optional(Schema.String),
  employmentType: Schema.optional(Schema.String),
  wage: Schema.optional(Schema.String),
  workingHours: Schema.optional(Schema.String),
  employeeCount: Schema.optional(Schema.String),
  workPlace: Schema.optional(Schema.String),
  jobDescription: Schema.optional(Schema.String),
  qualifications: Schema.optional(Schema.String),
});
export type RawJob = typeof RawJob.Type;

// ── DOM セレクタマップ ──

const jobDetailSelectors = {
  jobNumber: "#ID_kjNo",
  companyName: "#ID_jgshMei",
  receivedDate: "#ID_uktkYmd",
  expiryDate: "#ID_shkiKigenHi",
  homePage: "#ID_hp",
  occupation: "#ID_sksu",
  employmentType: "#ID_koyoKeitai",
  wage: "#ID_chgn",
  workingHours: "#ID_shgJn1",
  employeeCount: "#ID_jgisKigyoZentai",
  workPlace: "#ID_shgBsJusho",
  jobDescription: "#ID_shigotoNy",
  qualifications: "#ID_hynaMenkyoSkku",
} as const;

// ── DOM → RawJob 抽出 ──

export function extractRawFieldsFromDocument(document: Document): RawJob {
  const text = (selector: string) =>
    document.querySelector(selector)?.textContent?.trim() || undefined;

  return {
    jobNumber: text(jobDetailSelectors.jobNumber),
    companyName: text(jobDetailSelectors.companyName),
    receivedDate: text(jobDetailSelectors.receivedDate),
    expiryDate: text(jobDetailSelectors.expiryDate),
    homePage: text(jobDetailSelectors.homePage) || null,
    occupation: text(jobDetailSelectors.occupation),
    employmentType: text(jobDetailSelectors.employmentType),
    wage: text(jobDetailSelectors.wage),
    workingHours: text(jobDetailSelectors.workingHours),
    employeeCount: text(jobDetailSelectors.employeeCount),
    workPlace: text(jobDetailSelectors.workPlace),
    jobDescription: text(jobDetailSelectors.jobDescription),
    qualifications: text(jobDetailSelectors.qualifications),
  };
}
