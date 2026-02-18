import { Schema } from "effect";
import {
  extractedJobSchema,
  RawEmployeeCountSchema,
  RawExpiryDateSchema,
  RawReceivedDateShema,
  RawWageSchema,
  RawWorkingHoursSchema,
  rawHomePageSchema,
} from "./extractor";

export const ISO8601 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const r = Symbol();
export type TransformedReceivedDateToISOStr = string & { [r]: unknown };
const e = Symbol();
export type TransformedExpiryDateToISOStr = string & { [e]: unknown };
const ec = Symbol();
export type TransformedEmployeeCount = number & { [ec]: unknown };

export const transformedReceivedDateToISOStrSchema = Schema.transform(
  RawReceivedDateShema,
  Schema.String.pipe(Schema.brand("TransformedReceivedDateToISOStr")),
  {
    strict: true,
    decode: (value) => {
      // "2025年7月23日" → "2025-07-23"
      const dateStr = value
        .replace("年", "-")
        .replace("月", "-")
        .replace("日", "");
      return new Date(dateStr).toISOString();
    },
    encode: () => {
      throw new Error("encode not supported");
    },
  },
);
export const transformedExpiryDateToISOStrSchema = Schema.transform(
  RawExpiryDateSchema,
  Schema.String.pipe(Schema.brand("TransformedJSTExpiryDateToISOStr")),
  {
    strict: true,
    decode: (value) => {
      // "2025年7月23日" → "2025-07-23"
      const dateStr = value
        .replace("年", "-")
        .replace("月", "-")
        .replace("日", "");
      return new Date(dateStr).toISOString();
    },
    encode: () => {
      throw new Error("encode not supported");
    },
  },
);

export const transformedWageSchema = Schema.transform(
  RawWageSchema,
  Schema.Struct({
    wageMin: Schema.Number,
    wageMax: Schema.Number,
  }),
  {
    strict: true,
    decode: (value) => {
      // 直接正規表現を使って上限と下限を抽出し、数値に変換
      const match = value.match(
        /^(\d{1,3}(?:,\d{3})*)円〜(\d{1,3}(?:,\d{3})*)円$/,
      );
      if (!match) {
        throw new Error("Invalid wage format");
      }
      // 数字のカンマを削除してから数値に変換
      const wageMin = Number.parseInt(match[1].replace(/,/g, ""), 10);
      const wageMax = Number.parseInt(match[2].replace(/,/g, ""), 10);
      return { wageMin, wageMax };
    },
    encode: () => {
      throw new Error("encode not supported");
    },
  },
);

export const transformedWorkingHoursSchema = Schema.transform(
  RawWorkingHoursSchema,
  Schema.Struct({
    workingStartTime: Schema.String,
    workingEndTime: Schema.String,
  }),
  {
    strict: true,
    decode: (value) => {
      const match = value.match(
        /^(\d{1,2})時(\d{1,2})分〜(\d{1,2})時(\d{1,2})分$/,
      );
      if (!match) {
        throw new Error("Invalid format, should be '9時00分〜18時00分'");
      }
      const [_, startH, startM, endH, endM] = match;
      const workingStartTime = `${startH.padStart(2, "0")}:${startM.padStart(2, "0")}:00`;
      const workingEndTime = `${endH.padStart(2, "0")}:${endM.padStart(2, "0")}:00`;
      return { workingStartTime, workingEndTime };
    },
    encode: () => {
      throw new Error("encode not supported");
    },
  },
);

export const transformedEmployeeCountSchema = Schema.transform(
  RawEmployeeCountSchema,
  Schema.Number.pipe(Schema.brand("TransformedEmployeeCount")),
  {
    strict: true,
    decode: (val) => {
      const match = val.match(/\d+/);
      if (!match) {
        throw new Error("Invalid employee count format");
      }
      return Number(match[0]);
    },
    encode: () => {
      throw new Error("encode not supported");
    },
  },
);

export const transformedHomePageSchema = Schema.transform(
  rawHomePageSchema,
  Schema.String.pipe(
    Schema.filter((s) => URL.canParse(s), {
      message: () => "home page should be url",
    }),
    Schema.brand("homePage(transformed)"),
  ),
  {
    strict: true,
    decode: (val) => val.trim(),
    encode: () => {
      throw new Error("encode not supported");
    },
  },
);

const {
  wage: _wage,
  workingHours: _workingHours,
  homePage: _homePage,
  ...extractedWithoutTransformed
} = extractedJobSchema.fields;

export const transformedSchema = Schema.Struct({
  ...extractedWithoutTransformed,
  homePage: Schema.optional(transformedHomePageSchema),
  wageMin: Schema.Number,
  wageMax: Schema.Number,
  workingStartTime: Schema.String,
  workingEndTime: Schema.String,
  receivedDate: Schema.String.pipe(Schema.pattern(ISO8601)),
  expiryDate: Schema.String.pipe(Schema.pattern(ISO8601)),
  employeeCount: Schema.Number,
});
