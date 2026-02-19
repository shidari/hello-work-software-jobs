import {
  EmployeeCount,
  HomePageUrl,
  ISODate,
  Wage,
  WorkingTime,
} from "@sho/models";
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

export const transformedReceivedDateToISOStrSchema = Schema.transform(
  RawReceivedDateShema,
  ISODate,
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
  ISODate,
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
    wageMin: Wage,
    wageMax: Wage,
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
    workingStartTime: WorkingTime,
    workingEndTime: WorkingTime,
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
  EmployeeCount,
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
  HomePageUrl,
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
  wageMin: Wage,
  wageMax: Wage,
  workingStartTime: WorkingTime,
  workingEndTime: WorkingTime,
  receivedDate: ISODate,
  expiryDate: ISODate,
  employeeCount: EmployeeCount,
});
