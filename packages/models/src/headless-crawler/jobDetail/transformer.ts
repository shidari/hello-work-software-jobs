import * as v from "valibot";
import {
  extractedJobSchema,
  RawEmployeeCountSchema,
  RawExpiryDateSchema,
  rawHomePageSchema,
  RawReceivedDateShema,
  RawWageSchema,
  RawWorkingHoursSchema,
} from "./extractor";

export const ISO8601 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const r = Symbol();
export type TransformedReceivedDateToISOStr = string & { [r]: unknown };
const e = Symbol();
export type TransformedExpiryDateToISOStr = string & { [e]: unknown };
const ec = Symbol();
export type TransformedEmployeeCount = number & { [ec]: unknown };

export const transformedReceivedDateToISOStrSchema = v.pipe(
  RawReceivedDateShema,
  v.transform((value) => {
    // "2025年7月23日" → "2025-07-23"
    const dateStr = value
      .replace("年", "-")
      .replace("月", "-")
      .replace("日", "");
    const isoDate = new Date(dateStr).toISOString();
    return isoDate;
  }),
  v.brand("TransformedReceivedDateToISOStr"),
);
export const transformedExpiryDateToISOStrSchema = v.pipe(
  RawExpiryDateSchema,
  v.transform((value) => {
    // "2025年7月23日" → "2025-07-23"
    const dateStr = value
      .replace("年", "-")
      .replace("月", "-")
      .replace("日", "");
    const isoDate = new Date(dateStr).toISOString();
    return isoDate;
  }),
  v.brand("TransformedJSTExpiryDateToISOStr"),
);

export const transformedWageSchema = v.pipe(
  RawWageSchema,
  v.transform((value) => {
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
    return { wageMin, wageMax }; // 上限と下限の数値オブジェクトを返す
  }),
  v.check(
    (wage) =>
      !!v.parse(v.object({ wageMin: v.number(), wageMax: v.number() }), wage),
  ),
); // 後でもうちょっとまともにかく

export const transformedWorkingHoursSchema = v.pipe(
  RawWorkingHoursSchema,
  v.transform((value) => {
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
  }),
);

export const transformedEmployeeCountSchema = v.pipe(
  RawEmployeeCountSchema,
  v.transform((val) => {
    const match = val.match(/\d+/);
    if (!match) {
      // ここも、後で直す
      return undefined;
    }
    return Number(match[0]);
  }),
  v.number(),
  v.brand("TransformedEmployeeCount"),
);

export const transformedHomePageSchema = v.pipe(
  rawHomePageSchema,
  v.transform((val) => val.trim()),
  v.url("home page should be url"),
  v.brand("homePage(transformed)"),
);

export const transformedSchema = v.object({
  ...v.omit(extractedJobSchema, ["wage", "workingHours", "homePage"]).entries,
  homePage: v.optional(transformedHomePageSchema),
  wageMin: v.number(),
  wageMax: v.number(),
  workingStartTime: v.string(),
  workingEndTime: v.string(),
  receivedDate: v.pipe(v.string(), v.regex(ISO8601)),
  expiryDate: v.pipe(v.string(), v.regex(ISO8601)),
  employeeCount: v.number(),
});
