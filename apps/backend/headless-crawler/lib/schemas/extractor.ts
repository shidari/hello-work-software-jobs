import { EmploymentType, JobNumber } from "@sho/models";
import { Schema } from "effect";

export { JobNumber };

export const companyNameSchema = Schema.String.pipe(
  Schema.brand("companyName"),
);

export const rawHomePageSchema = Schema.String.pipe(
  Schema.brand("homePage(raw)"),
);
export const occupationSchema = Schema.String.pipe(
  Schema.minLength(1, { message: () => "occupation should not be empty." }),
  Schema.brand("occupation"),
);
export const employmentTypeSchema = EmploymentType;

export const RawReceivedDateShema = Schema.String.pipe(
  Schema.pattern(/^\d{4}年\d{1,2}月\d{1,2}日$/, {
    message: () => "received date format invalid. should be yyyy年mm月dd日",
  }),
  Schema.brand("receivedDate(raw)"),
);

export const RawExpiryDateSchema = Schema.String.pipe(
  Schema.pattern(/^\d{4}年\d{1,2}月\d{1,2}日$/, {
    message: () => "expiry date format invalid. should be yyyy年mm月dd日",
  }),
  Schema.brand("expiryDate(raw)"),
);

export const RawWageSchema = Schema.String.pipe(
  Schema.minLength(1, { message: () => "wage should not be empty" }),
  Schema.brand("wage(raw)"),
);

export const RawWorkingHoursSchema = Schema.String.pipe(
  Schema.minLength(1, {
    message: () => "workingHours should not be empty.",
  }),
  Schema.brand("workingHours(raw)"),
);

export const workPlaceSchema = Schema.String.pipe(Schema.brand("workPlace"));

export const jobDescriptionSchema = Schema.String.pipe(
  Schema.brand("jobDescription"),
);

export const qualificationsSchema = Schema.UndefinedOr(Schema.String).pipe(
  Schema.brand("qualifications"),
);

export const RawEmployeeCountSchema = Schema.String.pipe(
  Schema.brand("employeeCount(raw)"),
);

export const extractedJobSchema = Schema.Struct({
  jobNumber: JobNumber,
  companyName: companyNameSchema,
  receivedDate: RawReceivedDateShema,
  expiryDate: RawExpiryDateSchema,
  homePage: Schema.NullOr(rawHomePageSchema),
  occupation: occupationSchema,
  employmentType: employmentTypeSchema,
  employeeCount: RawEmployeeCountSchema,
  wage: RawWageSchema,
  workingHours: RawWorkingHoursSchema,
  workPlace: workPlaceSchema,
  jobDescription: jobDescriptionSchema,
  qualifications: Schema.NullOr(qualificationsSchema),
});
