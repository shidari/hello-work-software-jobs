import { EmploymentType, JobCategory, JobNumber, WageType } from "@sho/models";
import { Arbitrary, Schema } from "effect";
import * as fc from "effect/FastCheck";
import { describe, expect, it } from "vitest";
import { RawJobToDomainJob } from "../transformer";

// ── arbitrary ──
//
// Arbitrary.make はスキーマ制約から arbitrary を自動導出できるが、
// 制約外の値（-0, 小数, パターン不一致等）が生成されることがある。
// filter で弾くと生成が遅くなる。
//
// 方針:
// - Arbitrary.make が安全に使えるもの（Union/Literal 系）→ Arbitrary.make を使う
// - shrink で壊れるもの（NonNegativeInt, Pattern 系）→ fc の primitive で手動構築

/** 日本語日付文字列（例: "2025年7月23日"） — transform 入力形式 */
const japaneseDateArb = fc
  .date({ min: new Date(1900, 0, 1), max: new Date(2099, 11, 28) })
  .map((d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`);

/** 賃金文字列（例: "200,000円〜300,000円"） — transform 入力形式 */
const wageStringArb = fc
  .tuple(fc.nat(), fc.nat())
  .map(([a, b]) => `${a.toLocaleString()}円〜${b.toLocaleString()}円`);

/** 勤務時間文字列（例: "9時00分〜18時00分"） — transform 入力形式 */
const workingHoursStringArb = fc
  .tuple(fc.nat(23), fc.nat(59), fc.nat(23), fc.nat(59))
  .map(([sh, sm, eh, em]) => `${sh}時${sm}分〜${eh}時${em}分`);

/** 従業員数文字列（例: "150人"） — transform 入力形式 */
const employeeCountStringArb = fc.nat().map((n) => `${n}人`);

const nullableStringArb = fc.oneof(fc.string(), fc.constant(null));

/** RawJob: RawJobToDomainJob の有効な入力 */
const rawJobArb = fc.record({
  jobNumber: Arbitrary.make(JobNumber),
  companyName: nullableStringArb,
  receivedDate: japaneseDateArb,
  expiryDate: japaneseDateArb,
  homePage: fc.oneof(
    fc
      .webUrl({ withFragments: false, withQueryParameters: false })
      .map((url) => url.replace(/^http:/, "https:")),
    fc.constant(null),
  ),
  occupation: fc.string({ minLength: 1, maxLength: 100 }),
  employmentType: Arbitrary.make(EmploymentType),
  wage: fc.oneof(wageStringArb, fc.constant(null)),
  workingHours: fc.oneof(workingHoursStringArb, fc.constant(null)),
  employeeCount: fc.oneof(employeeCountStringArb, fc.constant(null)),
  workPlace: nullableStringArb,
  jobDescription: nullableStringArb,
  qualifications: nullableStringArb,
  establishmentNumber: fc.constant(null),
  jobCategory: fc.oneof(Arbitrary.make(JobCategory), fc.constant(null)),
  industryClassification: nullableStringArb,
  publicEmploymentOffice: nullableStringArb,
  onlineApplicationAccepted: fc.oneof(
    fc.constantFrom("可", "不可"),
    fc.constant(null),
  ),
  dispatchType: nullableStringArb,
  employmentPeriod: nullableStringArb,
  ageRequirement: nullableStringArb,
  education: nullableStringArb,
  requiredExperience: nullableStringArb,
  trialPeriod: nullableStringArb,
  carCommute: nullableStringArb,
  transferPossibility: nullableStringArb,
  wageType: fc.oneof(Arbitrary.make(WageType), fc.constant(null)),
  raise: nullableStringArb,
  bonus: nullableStringArb,
  insurance: nullableStringArb,
  retirementBenefit: nullableStringArb,
});

const decodeRawJob = Schema.decodeUnknownEither(RawJobToDomainJob);

// ── テスト ──

describe("RawJobToDomainJob transform", () => {
  it("有効な RawJob → TransformedJob に変換される", () => {
    fc.assert(
      fc.property(rawJobArb, (raw) => {
        const result = decodeRawJob(raw);
        expect(result._tag).toBe("Right");
      }),
    );
  });
});
