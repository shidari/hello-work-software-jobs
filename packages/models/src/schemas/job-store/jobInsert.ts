import { literal, number, object, omit, regex, string } from "valibot";

const ISO8601 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

import { nullable, pipe } from "valibot";

const jobNumberSchema = pipe(
  string(),
  regex(/^\d{5}-\d{0,8}$/, "jobNumber format invalid."),
);
const companyNameSchema = string();
const homePageSchema = pipe(
  string(),
  regex(/^https?:\/\//, "home page should be url"),
);
const occupationSchema = pipe(
  string(),
  regex(/^.+$/, "occupation should not be empty."),
);
const employmentTypeSchema = pipe(
  string(),
  regex(/^(正社員|パート労働者|正社員以外|有期雇用派遣労働者)$/),
);
const RawReceivedDateSchema = pipe(
  string(),
  regex(
    /^\d{4}年\d{1,2}月\d{1,2}日$/,
    "received date format invalid. should be yyyy年mm月dd日",
  ),
);
const RawExpiryDateSchema = pipe(
  string(),
  regex(
    /^\d{4}年\d{1,2}月\d{1,2}日$/,
    "expiry date format invalid. should be yyyy年mm月dd日",
  ),
);
const RawWageSchema = pipe(string(), regex(/^.+$/, "wage should not be empty"));
const RawWorkingHoursSchema = pipe(
  string(),
  regex(/^.+$/, "workingHours should not be empty."),
);
const workPlaceSchema = string();
const jobDescriptionSchema = string();
const qualificationsSchema = string();
const RawEmployeeCountSchema = string();

export const unbrandedScrapedJobSchema = object({
  jobNumber: jobNumberSchema,
  companyName: companyNameSchema,
  receivedDate: RawReceivedDateSchema,
  expiryDate: RawExpiryDateSchema,
  homePage: nullable(homePageSchema),
  occupation: occupationSchema,
  employmentType: employmentTypeSchema,
  employeeCount: RawEmployeeCountSchema,
  wage: RawWageSchema,
  workingHours: RawWorkingHoursSchema,
  workPlace: workPlaceSchema,
  jobDescription: jobDescriptionSchema,
  qualifications: nullable(qualificationsSchema),
});

export const insertJobRequestBodySchema = object({
  ...omit(unbrandedScrapedJobSchema, ["wage", "workingHours"]).entries,
  wageMin: number(),
  wageMax: number(),
  workingStartTime: string(),
  workingEndTime: string(),
  receivedDate: pipe(string(), regex(ISO8601)),
  expiryDate: pipe(string(), regex(ISO8601)),
  employeeCount: number(),
});

export const insertJobResponseBodySchema = object({
  ...insertJobRequestBodySchema.entries,
  createdAt: pipe(string(), regex(ISO8601)), // 必要なら pipe(string(), regex(ISO8601))
  updatedAt: pipe(string(), regex(ISO8601)),
  status: string(),
});

// API レスポンス用スキーマ
export const insertJobSuccessResponseSchema = object({
  success: literal(true),
  result: object({
    job: insertJobResponseBodySchema,
  }),
});

export const insertJobClientErrorResponseSchema = object({
  message: string(),
});

export const insertJobServerErrorResponseSchema = object({
  message: string(),
});
