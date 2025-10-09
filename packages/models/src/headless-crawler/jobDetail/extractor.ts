import * as v from "valibot";

export const jobNumberSchema = v.pipe(
  v.string(),
  v.regex(/^\d{5}-\d{0,8}$/),
  v.brand("jobNumber"),
);
export const companyNameSchema = v.pipe(
  v.optional(v.string()),
  v.brand("companyName"),
);

export const homePageSchema = v.pipe(
  v.string(),
  v.url("home page should be url"),
  v.brand("homePage"),
);
export const occupationSchema = v.pipe(
  v.string(),
  v.minLength(1, "occupation should not be empty."),
  v.brand("occupation"),
);
export const employmentTypeSchema = v.pipe(
  v.union([
    v.literal("正社員"),
    v.literal("パート労働者"),
    v.literal("正社員以外"),
    v.literal("有期雇用派遣労働者"),
  ]),
  v.brand("employmentType"),
);

export const RawReceivedDateShema = v.pipe(
  v.string(),
  v.regex(
    /^\d{4}年\d{1,2}月\d{1,2}日$/,
    "received date format invalid. should be yyyy年mm月dd日",
  ),
  v.brand("receivedDate(raw)"),
);

export const RawExpiryDateSchema = v.pipe(
  v.string(),
  v.regex(
    /^\d{4}年\d{1,2}月\d{1,2}日$/,
    "expiry date format invalid. should be yyyy年mm月dd日",
  ),
  v.brand("expiryDate(raw)"),
);

export const RawWageSchema = v.pipe(
  v.string(),
  v.minLength(1, "wage should not be empty"),
  v.brand("wage(raw)"),
);

export const RawWorkingHoursSchema = v.pipe(
  v.string(),
  v.minLength(1, "workingHours should not be empty."),
  v.brand("workingHours(raw)"),
);

export const workPlaceSchema = v.pipe(v.string(), v.brand("workPlace"));

export const jobDescriptionSchema = v.pipe(
  v.string(),
  v.brand("jobDescription"),
);

export const qualificationsSchema = v.pipe(
  v.optional(v.string()),
  v.brand("qualifications"),
);

export const RawEmployeeCountSchema = v.pipe(
  v.string(),
  v.brand("employeeCount(raw)"),
);

export const extractedJobSchema = v.object({
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
