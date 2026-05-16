import type { DbCompanyRow, DbJobRow } from "@sho/db";
import type { RawCompany, RawJob } from "@sho/models/raw";
import { Schema } from "effect";
import { bench, describe } from "vitest";
import { CompanyToCompanyTable, JobToJobTable } from "../db";

// Hellowork 求人詳細から ETL を通った後の典型的な RawJob を模した固定 fixture。
// API の write path (commands.ts) はこの形を受け取って JobToJobTable で decode する。
const FIXTURE_RAW_JOB: RawJob = {
  jobNumber: "13010-12345678",
  companyName: "株式会社サンプル",
  receivedDate: "2026-04-01T00:00:00+09:00",
  expiryDate: "2026-06-30T23:59:59+09:00",
  homePage: "https://example.co.jp",
  occupation: "ソフトウェア開発技術者",
  employmentType: "正社員",
  wage: { min: 300000, max: 500000 },
  workingHours: { start: "09:00:00", end: "18:00:00" },
  employeeCount: 150,
  workPlace: "東京都渋谷区神宮前1-2-3 サンプルビル 5F",
  jobDescription:
    "Web アプリケーションの設計・開発・運用を担当いただきます。フロントエンド・バックエンドどちらも触れる環境です。",
  qualifications: "実務経験 3 年以上",
  establishmentNumber: "0101-626495-7",
  jobCategory: "フルタイム",
  industryClassification: "情報通信業",
  publicEmploymentOffice: "ハローワーク渋谷",
  onlineApplicationAccepted: true,
  dispatchType: "派遣・請負ではない",
  employmentPeriod: "雇用期間の定めなし",
  ageRequirement: "不問",
  education: "高校卒以上",
  requiredExperience: "実務経験 3 年以上",
  trialPeriod: "あり (3 ヶ月)",
  carCommute: "可",
  transferPossibility: "なし",
  wageType: "月給",
  raise: "あり (年 1 回)",
  bonus: "あり (年 2 回)",
  insurance: "雇用・労災・健康・厚生",
  retirementBenefit: "あり (勤続 3 年以上)",
};

// API の read path (queries.ts) は D1 から取った DbJobRow を encode で RawJob に戻す。
// status / createdAt / updatedAt は decode 時に自動付与される system フィールド。
const FIXTURE_DB_JOB_ROW: DbJobRow = {
  jobNumber: "13010-12345678",
  companyName: "株式会社サンプル",
  receivedDate: "2026-04-01T00:00:00+09:00",
  expiryDate: "2026-06-30T23:59:59+09:00",
  homePage: "https://example.co.jp",
  occupation: "ソフトウェア開発技術者",
  employmentType: "正社員",
  wageMin: 300000,
  wageMax: 500000,
  workingStartTime: "09:00:00",
  workingEndTime: "18:00:00",
  employeeCount: 150,
  workPlace: "東京都渋谷区神宮前1-2-3 サンプルビル 5F",
  jobDescription:
    "Web アプリケーションの設計・開発・運用を担当いただきます。フロントエンド・バックエンドどちらも触れる環境です。",
  qualifications: "実務経験 3 年以上",
  establishmentNumber: "0101-626495-7",
  jobCategory: "フルタイム",
  industryClassification: "情報通信業",
  publicEmploymentOffice: "ハローワーク渋谷",
  onlineApplicationAccepted: 1,
  dispatchType: "派遣・請負ではない",
  employmentPeriod: "雇用期間の定めなし",
  ageRequirement: "不問",
  education: "高校卒以上",
  requiredExperience: "実務経験 3 年以上",
  trialPeriod: "あり (3 ヶ月)",
  carCommute: "可",
  transferPossibility: "なし",
  wageType: "月給",
  raise: "あり (年 1 回)",
  bonus: "あり (年 2 回)",
  insurance: "雇用・労災・健康・厚生",
  retirementBenefit: "あり (勤続 3 年以上)",
  status: "active",
  createdAt: "2026-05-16T00:00:00.000Z",
  updatedAt: "2026-05-16T00:00:00.000Z",
};

const FIXTURE_RAW_COMPANY: RawCompany = {
  establishmentNumber: "0101-626495-7",
  companyName: "株式会社サンプル",
  postalCode: "150-0001",
  address: "東京都渋谷区神宮前1-2-3 サンプルビル 5F",
  employeeCount: 150,
  foundedYear: "2001",
  capital: "1,000万円",
  businessDescription: "Web アプリケーションの受託開発および自社サービス運営",
  corporateNumber: "9430001008073",
};

const FIXTURE_DB_COMPANY_ROW: DbCompanyRow = {
  ...FIXTURE_RAW_COMPANY,
  createdAt: "2026-05-16T00:00:00.000Z",
  updatedAt: "2026-05-16T00:00:00.000Z",
};

// Schema.decode/encode の compile を bench 外に出す。runtime コストだけを測りたい。
const decodeJob = Schema.decodeSync(JobToJobTable);
const encodeJob = Schema.encodeUnknownSync(JobToJobTable);
const decodeCompany = Schema.decodeSync(CompanyToCompanyTable);
const encodeCompany = Schema.encodeUnknownSync(CompanyToCompanyTable);

describe("API Schema transforms: JobToJobTable", () => {
  bench("decode: RawJob → DbJobRow (write path / INSERT)", () => {
    decodeJob(FIXTURE_RAW_JOB);
  });

  bench("encode: DbJobRow → RawJob (read path / SELECT)", () => {
    encodeJob(FIXTURE_DB_JOB_ROW);
  });
});

describe("API Schema transforms: CompanyToCompanyTable", () => {
  bench("decode: RawCompany → DbCompanyRow (write path / UPSERT)", () => {
    decodeCompany(FIXTURE_RAW_COMPANY);
  });

  bench("encode: DbCompanyRow → RawCompany (read path / SELECT)", () => {
    encodeCompany(FIXTURE_DB_COMPANY_ROW);
  });
});
