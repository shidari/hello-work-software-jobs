import * as z from "zod";
export const jobNumberSchema = z
  .string()
  .regex(/^\d{5}-\d{0,8}$/, "jobNumber format invalid.")
  .brand("jobNumber");
export const companyNameSchema = z.string().brand("companyName");

export const homePageSchema = z
  .string()
  .url("home page should be url")
  .brand("homePage");
export const occupationSchema = z
  .string()
  .min(1, "occupation should not be empty.")
  .brand("occupation");
export const employmentTypeSchema = z
  .enum(["正社員", "パート労働者", "正社員以外", "有期雇用派遣労働者"])
  .brand("employmentType");

export const RawReceivedDateShema = z
  .string()
  .regex(
    /^\d{4}年\d{1,2}月\d{1,2}日$/,
    "received date format invalid. should be yyyy年mm月dd日",
  )
  .brand("receivedDate(raw)");

export const RawExpiryDateSchema = z
  .string()
  .regex(
    /^\d{4}年\d{1,2}月\d{1,2}日$/,
    "expiry date format invalid. should be yyyy年mm月dd日",
  )
  .brand("expiryDate(raw)");

export const RawWageSchema = z
  .string()
  .min(1, "wage should not be empty")
  .brand("wage(raw)");

export const RawWorkingHoursSchema = z
  .string()
  .min(1, "workingHours should not be empty.")
  .brand("workingHours(raw)");

export const workPlaceSchema = z.string().brand("workPlace");

export const jobDescriptionSchema = z.string().brand("jobDescription");

export const qualificationsSchema = z.string().brand("qualifications");

export const RawEmployeeCountSchema = z.string().brand("employeeCount(raw)");

const r = Symbol();
export type TransformedJSTReceivedDateToISOStr = string & { [r]: unknown };
const e = Symbol();
export type TransformedJSTExpiryDateToISOStr = string & { [e]: unknown };
const ec = Symbol();
export type TransformedEmployeeCount = number & { [ec]: unknown };

export const transformedJSTReceivedDateToISOStrSchema =
  RawReceivedDateShema.transform((value) => {
    // "2025年7月23日" → "2025-07-23"
    const dateStr = value
      .replace("年", "-")
      .replace("月", "-")
      .replace("日", "");

    const isoDate = new Date(dateStr).toISOString();
    return isoDate;
  }).brand<TransformedJSTReceivedDateToISOStr>();
export const transformedJSTExpiryDateToISOStrSchema =
  RawExpiryDateSchema.transform((value) => {
    // "2025年7月23日" → "2025-07-23"
    const dateStr = value
      .replace("年", "-")
      .replace("月", "-")
      .replace("日", "");

    const isoDate = new Date(dateStr).toISOString();
    return isoDate;
  }).brand<TransformedJSTExpiryDateToISOStr>();

export const transformedWageSchema = RawWageSchema.transform((value) => {
  // 直接正規表現を使って上限と下限を抽出し、数値に変換
  const match = value.match(/^(\d{1,3}(?:,\d{3})*)円〜(\d{1,3}(?:,\d{3})*)円$/);

  if (!match) {
    throw new Error("Invalid wage format");
  }

  // 数字のカンマを削除してから数値に変換
  const wageMin = Number.parseInt(match[1].replace(/,/g, ""), 10);
  const wageMax = Number.parseInt(match[2].replace(/,/g, ""), 10);
  return { wageMin, wageMax }; // 上限と下限の数値オブジェクトを返す
}).refine((wage) =>
  z.object({ wageMin: z.number(), wageMax: z.number() }).parse(wage),
);

export const transformedWorkingHoursSchema = RawWorkingHoursSchema.transform(
  (value) => {
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
);

export const transformedEmployeeCountSchema = RawEmployeeCountSchema.transform(
  (val, ctx) => {
    const match = val.match(/\d+/);
    if (!match) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No numeric value found",
      });
      return z.NEVER;
    }
    return Number(match[0]);
  },
)
  .pipe(
    z
      .number({
        // invalid_type_error: "Failed to convert to a number",
      })
      .int("Must be an integer")
      .nonnegative("Must be a non-negative number"),
  )
  .brand<TransformedEmployeeCount>();

export const ScrapedJobSchema = z.object({
  jobNumber: jobNumberSchema,
  companyName: companyNameSchema,
  receivedDate: RawReceivedDateShema,
  expiryDate: RawExpiryDateSchema,
  homePage: homePageSchema.nullable(),
  occupation: occupationSchema,
  employmentType: employmentTypeSchema,
  employeeCount: RawEmployeeCountSchema,
  wage: RawWageSchema,
  workingHours: RawWorkingHoursSchema,
  workPlace: workPlaceSchema,
  jobDescription: jobDescriptionSchema,
  qualifications: qualificationsSchema.nullable(),
});
