import { Schema } from "effect";
import * as fc from "effect/FastCheck";
import { describe, expect, it } from "vitest";
import { RawJobToDomainJob, type TransformedJob } from "../transformer";

// ── ヘルパー ──

/** 日本語日付文字列の arbitrary（例: "2025年7月23日"） */
const japaneseDateArb = fc
  .record({
    year: fc.integer({ min: 2000, max: 2099 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(({ year, month, day }) => `${year}年${month}月${day}日`);

/** 賃金文字列の arbitrary（例: "200,000円〜300,000円"） */
const wageStringArb = fc
  .tuple(
    fc.integer({ min: 100, max: 9_999_999 }),
    fc.integer({ min: 100, max: 9_999_999 }),
  )
  .map(([a, b]) => {
    const [min, max] = a <= b ? [a, b] : [b, a];
    return `${min.toLocaleString()}円〜${max.toLocaleString()}円`;
  });

/** 勤務時間文字列の arbitrary（例: "9時00分〜18時00分"） */
const workingHoursStringArb = fc
  .record({
    startH: fc.integer({ min: 0, max: 23 }),
    startM: fc.integer({ min: 0, max: 59 }),
    endH: fc.integer({ min: 0, max: 23 }),
    endM: fc.integer({ min: 0, max: 59 }),
  })
  .map(
    ({ startH, startM, endH, endM }) =>
      `${startH}時${startM}分〜${endH}時${endM}分`,
  );

/** 従業員数文字列の arbitrary（例: "150人"） */
const employeeCountStringArb = fc
  .integer({ min: 1, max: 99999 })
  .map((n) => `${n}人`);

/** 求人番号の arbitrary（例: "13010-12345678"） */
const jobNumberArb = fc
  .tuple(
    fc.integer({ min: 10000, max: 99999 }),
    fc.integer({ min: 0, max: 99999999 }),
  )
  .map(([prefix, suffix]) => `${prefix}-${String(suffix).padStart(8, "0")}`);

/** 雇用形態の arbitrary */
const employmentTypeArb = fc.constantFrom(
  "正社員",
  "パート労働者",
  "正社員以外",
  "有期雇用派遣労働者",
);

/** URL の arbitrary */
const urlArb = fc
  .webUrl({ withFragments: false, withQueryParameters: false })
  .map((url) => url.replace(/^http:/, "https:"));

/** 有効な RawJob 入力の arbitrary（全フィールド非null） */
const validRawJobArb = fc.record({
  jobNumber: jobNumberArb,
  companyName: fc.string({ minLength: 1, maxLength: 50 }),
  receivedDate: japaneseDateArb,
  expiryDate: japaneseDateArb,
  homePage: fc.oneof(urlArb, fc.constant(null)),
  occupation: fc.string({ minLength: 1, maxLength: 100 }),
  employmentType: employmentTypeArb,
  wage: fc.oneof(wageStringArb, fc.constant(null)),
  workingHours: fc.oneof(workingHoursStringArb, fc.constant(null)),
  employeeCount: fc.oneof(employeeCountStringArb, fc.constant(null)),
  workPlace: fc.oneof(
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.constant(null),
  ),
  jobDescription: fc.oneof(
    fc.string({ minLength: 1, maxLength: 200 }),
    fc.constant(null),
  ),
  qualifications: fc.oneof(
    fc.string({ minLength: 1, maxLength: 200 }),
    fc.constant(null),
  ),
});

const decode = Schema.decodeUnknownEither(RawJobToDomainJob);

// ── テスト ──

describe("transformer PBT: 各 transform の振る舞い", () => {
  it("有効な日本語日付 → 有効な ISO8601 文字列に変換される", () => {
    fc.assert(
      fc.property(japaneseDateArb, (dateStr) => {
        const raw = {
          jobNumber: "13010-00000001",
          companyName: "テスト株式会社",
          receivedDate: dateStr,
          expiryDate: dateStr,
          homePage: null,
          occupation: "エンジニア",
          employmentType: "正社員",
          wage: null,
          workingHours: null,
          employeeCount: null,
          workPlace: null,
          jobDescription: null,
          qualifications: null,
        };
        const result = decode(raw);
        if (result._tag === "Right") {
          expect(result.right.receivedDate).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
          );
        }
      }),
    );
  });

  it("有効な賃金文字列 → min <= max", () => {
    fc.assert(
      fc.property(wageStringArb, (wageStr) => {
        const raw = {
          jobNumber: "13010-00000001",
          companyName: "テスト株式会社",
          receivedDate: "2025年1月1日",
          expiryDate: "2025年12月31日",
          homePage: null,
          occupation: "エンジニア",
          employmentType: "正社員",
          wage: wageStr,
          workingHours: null,
          employeeCount: null,
          workPlace: null,
          jobDescription: null,
          qualifications: null,
        };
        const result = decode(raw);
        if (result._tag === "Right" && result.right.wage != null) {
          expect(result.right.wage.min).toBeLessThanOrEqual(
            result.right.wage.max,
          );
        }
      }),
    );
  });

  it("有効な勤務時間文字列 → HH:MM:SS 形式に変換される", () => {
    fc.assert(
      fc.property(workingHoursStringArb, (hoursStr) => {
        const raw = {
          jobNumber: "13010-00000001",
          companyName: "テスト株式会社",
          receivedDate: "2025年1月1日",
          expiryDate: "2025年12月31日",
          homePage: null,
          occupation: "エンジニア",
          employmentType: "正社員",
          wage: null,
          workingHours: hoursStr,
          employeeCount: null,
          workPlace: null,
          jobDescription: null,
          qualifications: null,
        };
        const result = decode(raw);
        if (result._tag === "Right" && result.right.workingHours != null) {
          const { start, end } = result.right.workingHours;
          const timePattern = /^\d{2}:\d{2}:00$/;
          if (start != null) expect(start).toMatch(timePattern);
          if (end != null) expect(end).toMatch(timePattern);
        }
      }),
    );
  });

  it("数字を含む従業員数文字列 → 非負整数に変換される", () => {
    fc.assert(
      fc.property(employeeCountStringArb, (countStr) => {
        const raw = {
          jobNumber: "13010-00000001",
          companyName: "テスト株式会社",
          receivedDate: "2025年1月1日",
          expiryDate: "2025年12月31日",
          homePage: null,
          occupation: "エンジニア",
          employmentType: "正社員",
          wage: null,
          workingHours: null,
          employeeCount: countStr,
          workPlace: null,
          jobDescription: null,
          qualifications: null,
        };
        const result = decode(raw);
        if (result._tag === "Right" && result.right.employeeCount != null) {
          expect(result.right.employeeCount).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(result.right.employeeCount)).toBe(true);
        }
      }),
    );
  });

  it("URL → https:// で始まる有効な URL に変換される", () => {
    fc.assert(
      fc.property(urlArb, (url) => {
        const raw = {
          jobNumber: "13010-00000001",
          companyName: "テスト株式会社",
          receivedDate: "2025年1月1日",
          expiryDate: "2025年12月31日",
          homePage: url,
          occupation: "エンジニア",
          employmentType: "正社員",
          wage: null,
          workingHours: null,
          employeeCount: null,
          workPlace: null,
          jobDescription: null,
          qualifications: null,
        };
        const result = decode(raw);
        if (result._tag === "Right" && result.right.homePage != null) {
          expect(result.right.homePage).toMatch(/^https?:\/\//);
          expect(URL.canParse(result.right.homePage)).toBe(true);
        }
      }),
    );
  });
});

describe("transformer PBT: encode(decode(s)) === s roundtrip", () => {
  it("賃金: encode(decode(s)) === s の形式で roundtrip できる", () => {
    const wageArb = fc.integer({ min: 100, max: 9_999_999 }).chain((min) =>
      fc.integer({ min, max: 9_999_999 }).map((max) => {
        const fmt = (n: number) => n.toLocaleString("ja-JP");
        return `${fmt(min)}円〜${fmt(max)}円`;
      }),
    );
    const wageField = Schema.Struct({ wage: RawJobToDomainJob.fields.wage });
    fc.assert(
      fc.property(wageArb, (wageStr) => {
        const decoded = Schema.decodeSync(wageField)({ wage: wageStr });
        const encoded = Schema.encodeSync(wageField)(decoded);
        return encoded.wage === wageStr;
      }),
    );
  });

  it("勤務時間: encode(decode(s)) === s の形式で roundtrip できる", () => {
    const hoursArb = fc
      .record({
        sH: fc.integer({ min: 0, max: 23 }),
        sM: fc.integer({ min: 0, max: 59 }),
        eH: fc.integer({ min: 0, max: 23 }),
        eM: fc.integer({ min: 0, max: 59 }),
      })
      .map(
        ({ sH, sM, eH, eM }) =>
          `${sH}時${String(sM).padStart(2, "0")}分〜${eH}時${String(eM).padStart(2, "0")}分`,
      );
    const hoursField = Schema.Struct({
      workingHours: RawJobToDomainJob.fields.workingHours,
    });
    fc.assert(
      fc.property(hoursArb, (hoursStr) => {
        const decoded = Schema.decodeSync(hoursField)({
          workingHours: hoursStr,
        });
        const encoded = Schema.encodeSync(hoursField)(decoded);
        return encoded.workingHours === hoursStr;
      }),
    );
  });

  it("従業員数: encode(decode(s)) === s の形式で roundtrip できる", () => {
    const countArb = fc.integer({ min: 1, max: 999999 }).map((n) => `${n}人`);
    const countField = Schema.Struct({
      employeeCount: RawJobToDomainJob.fields.employeeCount,
    });
    fc.assert(
      fc.property(countArb, (countStr) => {
        const decoded = Schema.decodeSync(countField)({
          employeeCount: countStr,
        });
        const encoded = Schema.encodeSync(countField)(decoded);
        return encoded.employeeCount === countStr;
      }),
    );
  });

  it("日付(受付日): encode(decode(s)) === s の形式で roundtrip できる", () => {
    const dateArb = fc
      .record({
        year: fc.integer({ min: 2000, max: 2099 }),
        month: fc.integer({ min: 1, max: 12 }),
        day: fc.integer({ min: 1, max: 28 }),
      })
      .map(({ year, month, day }) => `${year}年${month}月${day}日`);
    const dateField = Schema.Struct({
      receivedDate: RawJobToDomainJob.fields.receivedDate,
    });
    fc.assert(
      fc.property(dateArb, (dateStr) => {
        const decoded = Schema.decodeSync(dateField)({
          receivedDate: dateStr,
        });
        const encoded = Schema.encodeSync(dateField)(decoded);
        return encoded.receivedDate === dateStr;
      }),
    );
  });

  it("ホームページURL: https://付きURLはそのまま roundtrip できる", () => {
    const httpsUrlArb = fc
      .webUrl({ withFragments: false, withQueryParameters: false })
      .map((url) => url.replace(/^http:/, "https:"))
      .filter((u) => /^https:\/\//.test(u));
    const hpField = Schema.Struct({
      homePage: RawJobToDomainJob.fields.homePage,
    });
    fc.assert(
      fc.property(httpsUrlArb, (url) => {
        const decoded = Schema.decodeSync(hpField)({ homePage: url });
        const encoded = Schema.encodeSync(hpField)(decoded);
        return encoded.homePage === url;
      }),
    );
  });
});

describe("transformer PBT: RawJobToDomainJob の全体的な振る舞い", () => {
  it("nullable フィールドが全て null でもエラーなく変換される", () => {
    fc.assert(
      fc.property(
        jobNumberArb,
        japaneseDateArb,
        japaneseDateArb,
        employmentTypeArb,
        (jobNumber, receivedDate, expiryDate, employmentType) => {
          const raw = {
            jobNumber,
            companyName: null,
            receivedDate,
            expiryDate,
            homePage: null,
            occupation: "テスト職種",
            employmentType,
            wage: null,
            workingHours: null,
            employeeCount: null,
            workPlace: null,
            jobDescription: null,
            qualifications: null,
          };
          const result = decode(raw);
          expect(result._tag).toBe("Right");
          if (result._tag === "Right") {
            expect(result.right.companyName).toBeNull();
            expect(result.right.wage).toBeNull();
            expect(result.right.workingHours).toBeNull();
            expect(result.right.employeeCount).toBeNull();
          }
        },
      ),
    );
  });

  it("全フィールドが有効な値 → TransformedJob が返却される", () => {
    fc.assert(
      fc.property(validRawJobArb, (raw) => {
        const result = decode(raw);
        expect(result._tag).toBe("Right");
        if (result._tag === "Right") {
          const job: TransformedJob = result.right;
          expect(job.jobNumber).toBeDefined();
          expect(job.receivedDate).toBeDefined();
          expect(job.expiryDate).toBeDefined();
          expect(job.occupation).toBeDefined();
          expect(job.employmentType).toBeDefined();
        }
      }),
    );
  });
});
