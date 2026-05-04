import { Either, Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  CorporateNumber,
  EmployeeCount,
  EmploymentType,
  EstablishmentNumber,
  ExpiryDate,
  HomePageUrl,
  JobCategory,
  JobNumber,
  ReceivedDate,
  Wage,
  WageType,
  WorkingTime,
} from "./index";

const valid = <A, I>(schema: Schema.Schema<A, I>, input: I) => {
  const result = Schema.decodeUnknownEither(schema)(input);
  expect(
    Either.isRight(result),
    `expected ${JSON.stringify(input)} to decode`,
  ).toBe(true);
  return Either.getOrThrow(result);
};

const invalid = <A, I>(schema: Schema.Schema<A, I>, input: unknown) => {
  const result = Schema.decodeUnknownEither(schema)(input);
  expect(
    Either.isLeft(result),
    `expected ${JSON.stringify(input)} to be rejected`,
  ).toBe(true);
};

describe("JobNumber", () => {
  it("正しい形式を受理する", () => {
    valid(JobNumber, "13010-12345678");
    valid(JobNumber, "99999-00000000");
  });

  it("不正な形式を拒否する", () => {
    invalid(JobNumber, "1234-12345678");
    invalid(JobNumber, "13010_12345678");
    invalid(JobNumber, "abcde-12345678");
  });

  it("decode → encode で元の文字列に戻る", () => {
    const decoded = valid(JobNumber, "13010-12345678");
    const encoded = Schema.encodeSync(JobNumber)(decoded);
    expect(encoded).toBe("13010-12345678");
  });
});

describe("EstablishmentNumber", () => {
  it("正しい形式を受理する", () => {
    valid(EstablishmentNumber, "0101-626495-7");
  });

  it("不正な形式を拒否する", () => {
    invalid(EstablishmentNumber, "01-626495-7");
    invalid(EstablishmentNumber, "0101-626495");
    invalid(EstablishmentNumber, "0101-626495-77");
  });
});

describe("CorporateNumber", () => {
  it("13 桁の数字を受理する", () => {
    valid(CorporateNumber, "9430001008073");
  });

  it("13 桁以外を拒否する", () => {
    invalid(CorporateNumber, "943000100807");
    invalid(CorporateNumber, "94300010080734");
    invalid(CorporateNumber, "abcdefghijklm");
  });
});

describe("ReceivedDate / ExpiryDate", () => {
  it("ISO8601 文字列を受理する", () => {
    valid(ReceivedDate, "2026-05-01T00:00:00Z");
    valid(ExpiryDate, "2026-07-31T23:59:59.999+09:00");
  });

  it("非 ISO8601 を拒否する", () => {
    invalid(ReceivedDate, "2026-05-01");
    invalid(ReceivedDate, "2026/05/01T00:00:00Z");
  });
});

describe("HomePageUrl", () => {
  it("URL.canParse で受理可能な URL のみ通る", () => {
    valid(HomePageUrl, "https://example.com");
    valid(HomePageUrl, "https://example.com/path?q=1#frag");
  });

  it("URL として不正な文字列を拒否する", () => {
    invalid(HomePageUrl, "not a url");
    invalid(HomePageUrl, "://broken");
  });
});

describe("EmploymentType / JobCategory / WageType (Union リテラル)", () => {
  it("既知のリテラルを受理する", () => {
    valid(EmploymentType, "正社員");
    valid(EmploymentType, "パート労働者");
    valid(JobCategory, "フルタイム");
    valid(WageType, "月給");
  });

  it("未知のリテラルを拒否する", () => {
    invalid(EmploymentType, "役員");
    invalid(JobCategory, "アルバイト");
    invalid(WageType, "年俸");
  });
});

describe("Wage / EmployeeCount (NonNegativeInt brand)", () => {
  it("0 以上の整数を受理する", () => {
    valid(Wage, 0);
    valid(Wage, 300_000);
    valid(EmployeeCount, 100);
  });

  it("負の数・小数を拒否する", () => {
    invalid(Wage, -1);
    invalid(Wage, 1.5);
    invalid(EmployeeCount, -10);
  });
});

describe("WorkingTime", () => {
  it("HH:MM:SS を受理する", () => {
    valid(WorkingTime, "09:00:00");
    valid(WorkingTime, "23:59:59");
  });

  it("不正な形式を拒否する", () => {
    invalid(WorkingTime, "9:00:00");
    invalid(WorkingTime, "09-00-00");
    invalid(WorkingTime, "09:00");
  });
});
