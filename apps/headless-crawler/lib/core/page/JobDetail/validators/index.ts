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
    const result = v.safeParse(jobNumberSchema, val);
    if (!result.success) {
      yield* Effect.logDebug(
        `succeeded to validate jobNumber. val=${JSON.stringify(
          result.output,
          null,
          2,
        )}`,
      );
      return yield* Effect.fail(
        new JobNumberValidationError({
          message: result.issues.join("\n"),
        }),
      );
    }
    return yield* Effect.succeed(result.output);
  });
}

export function validateCompanyName(val: unknown) {
  return Effect.gen(function* () {
    const result = v.safeParse(companyNameSchema, val);
    if (!result.success) {
      return yield* Effect.fail(
        new CompanyNameValidationError({ message: result.issues.join("\n") }),
      ).pipe(
        Effect.tap(() => {
          return Effect.logDebug(
            `failed to validate companyName. received=${JSON.stringify(
              val,
              null,
              2,
            )}`,
          );
        }),
      );
    }
    return yield* Effect.succeed(result.output);
  });
}

export function validateReceivedDate(val: unknown) {
  return Effect.gen(function* () {
    const result = v.safeParse(RawReceivedDateShema, val);
    if (!result.success) {
      return yield* Effect.fail(
        new ReceivedDateValidationError({ message: result.issues.join("\n") }),
      ).pipe(
        Effect.tap(() => {
          Effect.logDebug(
            `failed to validate receivedDate. received=${JSON.stringify(
              val,
              null,
              2,
            )}`,
          );
        }),
      );
    }
    return yield* Effect.succeed(result.output);
  });
}
export function validateExpiryDate(val: unknown) {
  return Effect.gen(function* () {
    const result = v.safeParse(RawExpiryDateSchema, val);
    if (!result.success) {
      return yield* Effect.fail(
        new ExpiryDateValidationError({ message: result.issues.join("\n") }),
      ).pipe(
        Effect.tap(() => {
          Effect.logDebug(
            `failed to validate expiryDate. received=${JSON.stringify(
              val,
              null,
              2,
            )}`,
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
        new HomePageValidationError({ message: result.issues.join("\n") }),
      ).pipe(
        Effect.tap(() => {
          Effect.logDebug(
            `failed to validate homePage. received=${JSON.stringify(
              val,
              null,
              2,
            )}`,
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
        new OccupationValidationError({ message: result.issues.join("\n") }),
      ).pipe(
        Effect.tap(() => {
          Effect.logDebug(
            `failed to validate occupation. received=${JSON.stringify(
              val,
              null,
              2,
            )}`,
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
          ? new WageValidationError({ message: e.message })
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
        ? new WorkingHoursValidationError({ message: e.message })
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
export function validateEmployeeCount(val: unknown) {
  return Effect.try({
    try: () => v.parse(RawEmployeeCountSchema, val),
    catch: (e) =>
      e instanceof v.ValiError
        ? new EmployeeCountValidationError({ message: e.message })
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
        ? new WorkPlaceValidationError({ message: e.message })
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
        ? new JobDescriptionValidationError({ message: e.message })
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
      new QualificationValidationError({ message: result.issues.join("\n") }),
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
