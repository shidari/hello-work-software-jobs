import {
  type JobDetailPage,
  RawEmployeeCountSchema,
  RawExpiryDateSchema,
  RawReceivedDateShema,
  RawWageSchema,
  RawWorkingHoursSchema,
  companyNameSchema,
  employmentTypeSchema,
  jobDescriptionSchema,
  occupationSchema,
  qualificationsSchema,
  rawHomePageSchema,
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
  JobDescriptionValidationError,
  JobDetailPageValidationError,
  OccupationValidationError,
  QualificationValidationError,
  RawHomePageValidationError,
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
          detail: `${result.issues.map(issueToLogString).join("\n")}`,
          serializedVal: JSON.stringify(val, null, 2),
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

export function validateReceivedDate(val: unknown) {
  return Effect.gen(function* () {
    const result = v.safeParse(RawReceivedDateShema, val);
    if (!result.success) {
      return yield* Effect.fail(
        new ReceivedDateValidationError({
          detail: `${result.issues.map(issueToLogString).join("\n")}`,
          serializedVal: JSON.stringify(val, null, 2),
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
export function validateExpiryDate(val: unknown) {
  return Effect.gen(function* () {
    const result = v.safeParse(RawExpiryDateSchema, val);
    if (!result.success) {
      return yield* Effect.fail(
        new ExpiryDateValidationError({
          detail: `${result.issues.map(issueToLogString).join("\n")}`,
          serializedVal: JSON.stringify(val, null, 2),
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
export function validateRawHomePage(val: unknown) {
  return Effect.gen(function* () {
    const result = v.safeParse(rawHomePageSchema, val);
    if (!result.success) {
      return yield* Effect.fail(
        new RawHomePageValidationError({
          detail: `${result.issues.map(issueToLogString).join("\n")}`,
          serializedVal: JSON.stringify(val, null, 2),
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
          detail: `${result.issues.map(issueToLogString).join("\n")}`,
          serializedVal: JSON.stringify(val, null, 2),
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
        ? new EmploymentTypeValidationError({
            detail: e.message,
            serializedVal: JSON.stringify(val, null, 2),
          })
        : new EmploymentTypeValidationError({
            detail: `unexpected error.\n${e instanceof Error ? e.message : String(e)}`,
            serializedVal: JSON.stringify(val, null, 2),
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
              detail: `${e.issues.map(issueToLogString).join("\n")}`,
              serializedVal: JSON.stringify(val, null, 2),
            })
          : new WageValidationError({
              detail: `unexpected error.\n${e instanceof Error ? e.message : String(e)}`,
              serializedVal: JSON.stringify(val, null, 2),
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
            detail: `${e.issues.map(issueToLogString).join("\n")}`,
            serializedVal: JSON.stringify(val, null, 2),
          })
        : new WorkingHoursValidationError({
            detail: `unexpected error.\n${e instanceof Error ? e.message : String(e)}`,
            serializedVal: JSON.stringify(val, null, 2),
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
        ? new EmployeeCountValidationError({
            detail: `${e.issues.map(issueToLogString).join("\n")}`,
            serializedVal: JSON.stringify(val, null, 2),
          })
        : new EmployeeCountValidationError({
            detail: `${e instanceof Error ? e.message : String(e)}`,
            serializedVal: JSON.stringify(val, null, 2),
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
            detail: `${e.issues.map(issueToLogString).join("\n")}`,
            serializedVal: JSON.stringify(val, null, 2),
          })
        : new WorkPlaceValidationError({
            detail: `unexpected error. \n${e instanceof Error ? e.message : String(e)}`,
            serializedVal: JSON.stringify(val, null, 2),
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
            detail: `${e.issues.map(issueToLogString).join("\n")}`,
            serializedVal: JSON.stringify(val, null, 2),
          })
        : new JobDescriptionValidationError({
            detail: `unexpected error.\n${e instanceof Error ? e.message : String(e)}`,
            serializedVal: JSON.stringify(val, null, 2),
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
        detail: `${result.issues.map(issueToLogString).join("\n")}`,
        serializedVal: JSON.stringify(val, null, 2),
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
          reason: `${e instanceof Error ? e.message : String(e)}`,
          currentUrl: page.url(),
        }),
    }).pipe(
      Effect.tap((jobTitle) => {
        return Effect.logDebug(`extracted job title: ${jobTitle}`);
      }),
    );
    if (jobTitle !== "求人情報")
      throw new JobDetailPageValidationError({
        reason: `textContent of div.page_title should be 求人情報 but got: "${jobTitle}"`,
        currentUrl: page.url(),
      });
    // branded type　一旦型エラー抑制
    return page as unknown as JobDetailPage;
  });
}
