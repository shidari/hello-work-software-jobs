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
  transformedEmployeeCountSchema,
  transformedJSTExpiryDateToISOStrSchema,
  transformedJSTReceivedDateToISOStrSchema,
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
  OccupationValidationError,
  QualificationValidationError,
  ReceivedDateValidationError,
  WageValidationError,
  WorkingHoursValidationError,
  WorkPlaceValidationError,
} from "./error";
import { issueToLogString } from "../../../core/util";

export function validateCompanyName(val: unknown) {
  return Effect.gen(function* () {
    const result = v.safeParse(companyNameSchema, val);
    if (!result.success) {
      return yield* Effect.fail(
        new CompanyNameValidationError({
          message: `parse error. detail: ${result.issues.map(issueToLogString).join("\n")}`,
        }),
      ).pipe(
        Effect.tap(() => {
          return Effect.logDebug(
            `failed to validate companyName. detail: ${result.issues.map(issueToLogString).join("\n")}`,
          );
        }),
      );
    }
    return yield* Effect.succeed(result.output);
  });
}

export function validateThenTransformReceivedDate(val: unknown) {
  return Effect.gen(function* () {
    const result = v.safeParse(transformedJSTReceivedDateToISOStrSchema, val);
    if (!result.success) {
      return yield* Effect.fail(
        new ReceivedDateValidationError({
          message: `parse error. detail: ${result.issues.map(issueToLogString).join("\n")}`,
        }),
      ).pipe(
        Effect.tap(() => {
          Effect.logDebug(
            `failed to validate receivedDate. detail: ${result.issues.map(issueToLogString).join("\n")}`,
          );
        }),
      );
    }
    return yield* Effect.succeed(result.output);
  });
}
export function validateThenTransformExpiryDate(val: unknown) {
  return Effect.gen(function* () {
    const result = v.safeParse(transformedJSTExpiryDateToISOStrSchema, val);
    if (!result.success) {
      return yield* Effect.fail(
        new ExpiryDateValidationError({
          message: `parse error. detail: ${result.issues.map(issueToLogString).join("\n")}`,
        }),
      ).pipe(
        Effect.tap(() => {
          Effect.logDebug(
            `failed to validate expiryDate. detail: ${result.issues.map(issueToLogString).join("\n")}`,
          );
        }),
      );
    }
    return yield* Effect.succeed(result.output);
  });
}
export function validateHomePage(val: unknown) {
  return Effect.gen(function* () {
    const result = v.safeParse(homePageSchema, val);
    if (!result.success) {
      return yield* Effect.fail(
        new HomePageValidationError({
          message: `parse error. detail: ${result.issues.map(issueToLogString).join("\n")}`,
        }),
      ).pipe(
        Effect.tap(() => {
          Effect.logDebug(
            `failed to validate homePage. detail: ${result.issues.map(issueToLogString).join("\n")}`,
          );
        }),
      );
    }
    return yield* Effect.succeed(result.output);
  });
}

export function validateOccupation(val: unknown) {
  return Effect.gen(function* () {
    yield* Effect.logDebug(
      `calling validateOccupation. args=${JSON.stringify(val, null, 2)}`,
    );
    const result = v.safeParse(occupationSchema, val);
    if (!result.success) {
      yield* Effect.logDebug(
        `failed to validate occupation. issues=${JSON.stringify(result.issues, null, 2)}`,
      );
      return yield* Effect.fail(
        new OccupationValidationError({
          message: `parse error. detail: ${result.issues.map(issueToLogString).join("\n")}`,
        }),
      ).pipe(
        Effect.tap(() => {
          Effect.logDebug(
            `failed to validate occupation. detail: ${result.issues.map(issueToLogString).join("\n")}`,
          );
        }),
      );
    }
    yield* Effect.logDebug(
      `succeeded to validate occupation. val=${JSON.stringify(result.output, null, 2)}`,
    );
    return yield* Effect.succeed(result.output);
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
          ? new WageValidationError({
            message: `parse failed. detail: ${e.issues.map(issueToLogString).join("\n")}`,
          })
          : new WageValidationError({
            message: `unexpected error.\n${String(e)}`,
          }),
    }).pipe(
      Effect.tap((wage) => {
        return Effect.logDebug(
          `succeeded to validate wage. val=${JSON.stringify(wage, null, 2)}`,
        );
      }),
    );
  });
}

export function validateWorkingHours(val: unknown) {
  return Effect.try({
    try: () => v.parse(RawWorkingHoursSchema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new WorkingHoursValidationError({
          message: `parse failed. detail: ${e.issues.map(issueToLogString).join("\n")}`,
        })
        : new WorkingHoursValidationError({
          message: `unexpected error.\n${String(e)}`,
        }),
  }).pipe(
    Effect.tap((workingHours) => {
      return Effect.logDebug(
        `succeeded to validate workingHours. val=${JSON.stringify(workingHours, null, 2)}`,
      );
    }),
  );
}
export function validateThenTransformEmployeeCount(val: unknown) {
  return Effect.try({
    try: () => v.parse(transformedEmployeeCountSchema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new EmployeeCountValidationError({
          message: `parse failed. detail: ${e.issues.map(issueToLogString).join("\n")}`,
        })
        : new EmployeeCountValidationError({
          message: `unexpected error.\n${String(e)}`,
        }),
  }).pipe(
    Effect.tap((employeeCount) => {
      return Effect.logDebug(
        `succeeded to validate employeeCount. val=${JSON.stringify(employeeCount, null, 2)}`,
      );
    }),
  );
}

export function validateWorkPlace(val: unknown) {
  return Effect.try({
    try: () => v.parse(workPlaceSchema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new WorkPlaceValidationError({
          message: `parse failed. detail: ${e.issues.map(issueToLogString).join("\n")}`,
        })
        : new WorkPlaceValidationError({
          message: `unexpected error. \n${String(e)}`,
        }),
  }).pipe(
    Effect.tap((workPlace) => {
      return Effect.logDebug(
        `succeeded to validate workPlace. val=${JSON.stringify(workPlace, null, 2)}`,
      );
    }),
  );
}

export function validateJobDescription(val: unknown) {
  return Effect.try({
    try: () => v.parse(jobDescriptionSchema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new JobDescriptionValidationError({
          message: `parse failed. detail: ${e.issues.map(issueToLogString).join("\n")}`,
        })
        : new JobDescriptionValidationError({
          message: `unexpected error.\n${String}`,
        }),
  }).pipe(
    Effect.tap((jobDescription) => {
      return Effect.logDebug(
        `succeeded to validate jobDescription. val=${JSON.stringify(jobDescription, null, 2)}`,
      );
    }),
  );
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
      new QualificationValidationError({
        message: `parse failed. detail: ${result.issues.map(issueToLogString).join("\n")}`,
      }),
    ).pipe(
      Effect.tap(() => {
        Effect.logDebug(
          `failed to validate qualification. received=${JSON.stringify(
            val,
            null,
            2,
          )}`,
        );
      }),
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
    }).pipe(
      Effect.tap((jobTitle) => {
        return Effect.logDebug(`extracted job title: ${jobTitle}`);
      }),
    );
    if (jobTitle !== "求人情報")
      throw new JobDetailPageValidationError({
        message: `textContent of div.page_title should be 求人情報 but got: "${jobTitle}"`,
      });
    // branded type　一旦型エラー抑制
    return page as unknown as JobDetailPage;
  });
}
