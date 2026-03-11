import { Arbitrary, FastCheck, Schema } from "effect";
import { describe, it } from "vitest";
import { RawJobToDomainJob } from "./transformer";

describe("transformer roundtrip", () => {
  it("賃金: encode(decode(s)) === s の形式で roundtrip できる", () => {
    const wageArbitrary = FastCheck.integer({ min: 100, max: 9999999 }).chain(
      (min) =>
        FastCheck.integer({ min, max: 9999999 }).map((max) => {
          const fmt = (n: number) => n.toLocaleString("ja-JP");
          return `${fmt(min)}円〜${fmt(max)}円`;
        }),
    );
    const wageTransform = RawJobToDomainJob.fields.wage.pipe(
      Schema.typeSchema,
    );
    // NullOr wraps the actual transform; test the inner transform via full struct field
    FastCheck.assert(
      FastCheck.property(wageArbitrary, (wageStr) => {
        const decoded = Schema.decodeSync(
          Schema.Struct({ wage: RawJobToDomainJob.fields.wage }),
        )({ wage: wageStr });
        const encoded = Schema.encodeSync(
          Schema.Struct({ wage: RawJobToDomainJob.fields.wage }),
        )(decoded);
        return encoded.wage === wageStr;
      }),
    );
  });

  it("勤務時間: encode(decode(s)) === s の形式で roundtrip できる", () => {
    const hoursArbitrary = FastCheck.tuple(
      FastCheck.integer({ min: 0, max: 23 }),
      FastCheck.integer({ min: 0, max: 59 }),
      FastCheck.integer({ min: 0, max: 23 }),
      FastCheck.integer({ min: 0, max: 59 }),
    ).map(
      ([sH, sM, eH, eM]) =>
        `${sH}時${String(sM).padStart(2, "0")}分〜${eH}時${String(eM).padStart(2, "0")}分`,
    );
    FastCheck.assert(
      FastCheck.property(hoursArbitrary, (hoursStr) => {
        const decoded = Schema.decodeSync(
          Schema.Struct({
            workingHours: RawJobToDomainJob.fields.workingHours,
          }),
        )({ workingHours: hoursStr });
        const encoded = Schema.encodeSync(
          Schema.Struct({
            workingHours: RawJobToDomainJob.fields.workingHours,
          }),
        )(decoded);
        return encoded.workingHours === hoursStr;
      }),
    );
  });

  it("従業員数: encode(decode(s)) === s の形式で roundtrip できる", () => {
    const countArbitrary = FastCheck.integer({ min: 1, max: 999999 }).map(
      (n) => `${n}人`,
    );
    FastCheck.assert(
      FastCheck.property(countArbitrary, (countStr) => {
        const decoded = Schema.decodeSync(
          Schema.Struct({
            employeeCount: RawJobToDomainJob.fields.employeeCount,
          }),
        )({ employeeCount: countStr });
        const encoded = Schema.encodeSync(
          Schema.Struct({
            employeeCount: RawJobToDomainJob.fields.employeeCount,
          }),
        )(decoded);
        return encoded.employeeCount === countStr;
      }),
    );
  });

  it("日付(受付日): encode(decode(s)) === s の形式で roundtrip できる", () => {
    const dateArbitrary = FastCheck.date({
      min: new Date("2020-01-01"),
      max: new Date("2030-12-31"),
    }).map(
      (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`,
    );
    FastCheck.assert(
      FastCheck.property(dateArbitrary, (dateStr) => {
        const decoded = Schema.decodeSync(
          Schema.Struct({
            receivedDate: RawJobToDomainJob.fields.receivedDate,
          }),
        )({ receivedDate: dateStr });
        const encoded = Schema.encodeSync(
          Schema.Struct({
            receivedDate: RawJobToDomainJob.fields.receivedDate,
          }),
        )(decoded);
        return encoded.receivedDate === dateStr;
      }),
    );
  });

  it("ホームページURL: https://付きURLはそのまま roundtrip できる", () => {
    const urlArbitrary = FastCheck.webUrl().filter((u) =>
      /^https?:\/\//.test(u),
    );
    FastCheck.assert(
      FastCheck.property(urlArbitrary, (url) => {
        const decoded = Schema.decodeSync(
          Schema.Struct({ homePage: RawJobToDomainJob.fields.homePage }),
        )({ homePage: url });
        const encoded = Schema.encodeSync(
          Schema.Struct({ homePage: RawJobToDomainJob.fields.homePage }),
        )(decoded);
        return encoded.homePage === url;
      }),
    );
  });
});
