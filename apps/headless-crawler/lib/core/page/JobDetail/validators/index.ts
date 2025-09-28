import {
  type JobDetailPage,
  type JobListPage,
  RawEmployeeCountSchema,
  RawExpiryDateSchema,
  RawReceivedDateShema,
  RawWageSchema,
  RawWorkingHoursSchema,
  companyNameSchema,
  employmentTypeSchema,
  homePageSchema,
  jobDescriptionSchema,
  jobNumberSchema,
  occupationSchema,
  qualificationsSchema,
  workPlaceSchema,
} from "@sho/models";
import { Effect } from "effect";
import type { Page } from "playwright";
import * as v from "valibot";
import {
  CompanyNameValidationError,
  EmployeeCountValidationError,
  EmploymentTypeValidationError,
  ExpiryDateValidationError,
  HomePageValidationError,
  JobDescriptionValidationError,
  JobDetailPageValidationError,
  JobNumberValidationError,
  OccupationValidationError,
  QualificationValidationError,
  ReceivedDateValidationError,
  WageValidationError,
  WorkingHoursValidationError,
  WorkPlaceValidationError,
} from "./error";

export function validateJobNumber(val: unknown) {
  return Effect.gen(function* () {
    yield* Effect.logDebug(
      `calling validateJobNumber. args={val:${JSON.stringify(val, null, 2)}}`,
    );
    return yield* Effect.try({
      try: () => v.parse(jobNumberSchema, val),
      catch: (e) =>
        e instanceof v.ValiError
          ? new JobNumberValidationError({
            message: e.message,
          })
          : new JobNumberValidationError({
            message: `unexpected error.\n${String(e)}`,
          }),
    });
  });
}

export function validateCompanyName(val: unknown) {
  return Effect.try({
    try: () => v.parse(companyNameSchema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new CompanyNameValidationError({ message: e.message })
        : new CompanyNameValidationError({
          message: `unexpected error.\n${String(e)}`,
        }),
  });
}

export function validateReceivedDate(val: unknown) {
  return Effect.try({
    try: () => v.parse(RawReceivedDateShema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new ReceivedDateValidationError({ message: e.message })
        : new ReceivedDateValidationError({
          message: `unexpected error.\n${String(e)}`,
        }),
  });
}
export function validateExpiryDate(val: unknown) {
  return Effect.try({
    try: () => v.parse(RawExpiryDateSchema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new ExpiryDateValidationError({ message: e.message })
        : new ExpiryDateValidationError({
          message: `unexpected error.\n${String(e)}`,
        }),
  });
}
export function validateHomePage(val: unknown) {
  return Effect.try({
    try: () => v.parse(homePageSchema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new HomePageValidationError({ message: e.message })
        : new HomePageValidationError({
          message: `unexpected error.\n${String(e)}`,
        }),
  });
}

export function validateOccupation(val: unknown) {
  return Effect.gen(function* () {
    yield* Effect.logDebug(
      `calling validateOccupation. args=${JSON.stringify(val, null, 2)}`,
    );
    return yield* Effect.try({
      try: () => v.parse(occupationSchema, val),
      catch: (e) =>
        e instanceof v.ValiError
          ? new OccupationValidationError({ message: e.message })
          : new OccupationValidationError({
            message: `unexpected error.\n${String(e)}`,
          }),
    });
  });
}

export function validateEmploymentType(val: unknown) {
  return Effect.try({
    try: () => v.parse(employmentTypeSchema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new EmploymentTypeValidationError({ message: e.message })
        : new EmploymentTypeValidationError({
          message: `unexpected error.\n${String(e)}`,
        }),
  });
}

export function validateWage(val: unknown) {
  return Effect.gen(function* () {
    yield* Effect.logDebug(
      `calling validateWage. args=${JSON.stringify(val, null, 2)}`,
    );
    return yield* Effect.try({
      try: () => v.parse(RawWageSchema, val),
      catch: (e) =>
        e instanceof v.ValiError
          ? new WageValidationError({ message: e.message })
          : new WageValidationError({
            message: `unexpected error.\n${String(e)}`,
          }),
    });
  });
}

export function validateWorkingHours(val: unknown) {
  return Effect.try({
    try: () => v.parse(RawWorkingHoursSchema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new WorkingHoursValidationError({ message: e.message })
        : new WorkingHoursValidationError({
          message: `unexpected error.\n${String(e)}`,
        }),
  });
}
export function validateEmployeeCount(val: unknown) {
  return Effect.try({
    try: () => v.parse(RawEmployeeCountSchema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new EmployeeCountValidationError({ message: e.message })
        : new EmployeeCountValidationError({
          message: `unexpected error.\n${String(e)}`,
        }),
  });
}

export function validateWorkPlace(val: unknown) {
  return Effect.try({
    try: () => v.parse(workPlaceSchema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new WorkPlaceValidationError({ message: e.message })
        : new WorkPlaceValidationError({
          message: `unexpected error. \n${String(e)}`,
        }),
  });
}

export function validateJobDescription(val: unknown) {
  return Effect.try({
    try: () => v.parse(jobDescriptionSchema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new JobDescriptionValidationError({ message: e.message })
        : new JobDescriptionValidationError({
          message: `unexpected error.\n${String}`,
        }),
  });
}

export function validateQualification(
  val: unknown,
): Effect.Effect<
  v.InferOutput<typeof qualificationsSchema>,
  QualificationValidationError
> {
  const result = v.safeParse(qualificationsSchema, val);
  if (!result.success) {
    return Effect.fail(
      new QualificationValidationError({ message: result.issues.join("\n") }),
    );
  }
  return Effect.succeed(result.output);
}
export function validateJobDetailPage(
  page: Page,
): Effect.Effect<JobDetailPage, JobDetailPageValidationError, never> {
  return Effect.gen(function* () {
    const jobTitle = yield* Effect.tryPromise({
      try: async () => {
        const jobTitle = await page.locator("div.page_title").textContent();
        return jobTitle;
      },
      catch: (e) =>
        new JobDetailPageValidationError({
          message: `unexpected error.\n${String(e)}`,
        }),
    });
    if (jobTitle !== "求人情報")
      throw new JobDetailPageValidationError({
        message: `textContent of div.page_title should be 求人情報 but got: "${jobTitle}"`,
      });
    // branded type　一旦型エラー抑制
    return page as unknown as JobDetailPage;
  });
}
