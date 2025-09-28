import * as v from "valibot";
export const jobNumberSchema = v.pipe(v.string(), v.regex(/^\d{5}-\d{0,8}$/), v.brand("jobNumber"));
export const companyNameSchema = v.pipe(v.string(), v.brand("companyName"));

export const homePageSchema = v.pipe(v.string(), v.url("home page should be url"), v.brand("homePage"));
export const occupationSchema = v.pipe(v.string(), v.minLength(1, "occupation should not be empty."), v.brand("occupation"));
export const employmentTypeSchema = v.pipe(v.union([v.literal("正社員"), v.literal("パート労働者"), v.literal("正社員以外"), v.literal("有期雇用派遣労働者")]), v.brand("employmentType"));

export const RawReceivedDateShema = v.pipe(v.string(), v.regex(/^\d{4}年\d{1,2}月\d{1,2}日$/, "received date format invalid. should be yyyy年mm月dd日"), v.brand("receivedDate(raw)"));

export const RawExpiryDateSchema = v.pipe(v.string(), v.regex(/^\d{4}年\d{1,2}月\d{1,2}日$/, "expiry date format invalid. should be yyyy年mm月dd日"), v.brand("expiryDate(raw)"));

export const RawWageSchema = v.pipe(v.string(), v.minLength(1, "wage should not be empty"), v.brand("wage(raw)"));

export const RawWorkingHoursSchema = v.pipe(v.string(), v.minLength(1, "workingHours should not be empty."), v.brand("workingHours(raw)"));

export const workPlaceSchema = v.pipe(v.string(), v.brand("workPlace"));

export const jobDescriptionSchema = v.pipe(v.string(), v.brand("jobDescription"));

export const qualificationsSchema = v.pipe(v.string(), v.brand("qualifications"));

export const RawEmployeeCountSchema = v.pipe(v.string(), v.brand("employeeCount(raw)"));

const r = Symbol();
export type TransformedJSTReceivedDateToISOStr = string & { [r]: unknown };
const e = Symbol();
export type TransformedJSTExpiryDateToISOStr = string & { [e]: unknown };
const ec = Symbol();
export type TransformedEmployeeCount = number & { [ec]: unknown };

export const transformedJSTReceivedDateToISOStrSchema = v.pipe(RawReceivedDateShema, v.transform((value) => {
  // "2025年7月23日" → "2025-07-23"
  const dateStr = value.replace("年", "-").replace("月", "-").replace("日", "");
  const isoDate = new Date(dateStr).toISOString();
  return isoDate;
}), v.brand("TransformedJSTReceivedDateToISOStr"));
export const transformedJSTExpiryDateToISOStrSchema = v.pipe(RawExpiryDateSchema, v.transform((value) => {
  // "2025年7月23日" → "2025-07-23"
  const dateStr = value.replace("年", "-").replace("月", "-").replace("日", "");
  const isoDate = new Date(dateStr).toISOString();
  return isoDate;
}), v.brand("TransformedJSTExpiryDateToISOStr"));

export const transformedWageSchema = v.pipe(RawWageSchema, v.transform((value) => {
  // 直接正規表現を使って上限と下限を抽出し、数値に変換
  const match = value.match(/^(\d{1,3}(?:,\d{3})*)円〜(\d{1,3}(?:,\d{3})*)円$/);

  if (!match) {
    throw new Error("Invalid wage format");
  }

  // 数字のカンマを削除してから数値に変換
  const wageMin = Number.parseInt(match[1].replace(/,/g, ""), 10);
  const wageMax = Number.parseInt(match[2].replace(/,/g, ""), 10);
  return { wageMin, wageMax }; // 上限と下限の数値オブジェクトを返す
}), v.check((wage) => !!v.parse(v.object({ wageMin: v.number(), wageMax: v.number() }), wage))); // 後でもうちょっとまともにかく


export const transformedWorkingHoursSchema = v.pipe(RawWorkingHoursSchema, v.transform(
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
));

export const transformedEmployeeCountSchema = v.pipe(RawEmployeeCountSchema, v.transform(
  (val) => {
    const match = val.match(/\d+/);
    if (!match) {
      // ここも、後で直す
      return undefined;
    }
    return Number(match[0]);
  },
), v.number(), v.brand("TransformedEmployeeCount"));

export const ScrapedJobSchema = v.object({
  jobNumber: jobNumberSchema,
  companyName: companyNameSchema,
  receivedDate: RawReceivedDateShema,
  expiryDate: RawExpiryDateSchema,
  homePage: v.nullable(homePageSchema),
  occupation: occupationSchema,
  employmentType: employmentTypeSchema,
  employeeCount: RawEmployeeCountSchema,
  wage: RawWageSchema,
  workingHours: RawWorkingHoursSchema,
  workPlace: workPlaceSchema,
  jobDescription: jobDescriptionSchema,
  qualifications: v.nullable(qualificationsSchema),
});
