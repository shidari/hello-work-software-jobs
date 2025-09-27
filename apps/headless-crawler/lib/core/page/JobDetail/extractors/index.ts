import type { JobDetailPage, JobOverViewList, ScrapedJob } from "@sho/models";
import { Effect } from "effect";
import { ZodError } from "zod";
import {
  ExtractEmployeeCountError,
  ExtractEmployMentTypeError,
  ExtractExpiryDateError,
  ExtractHomePageError,
  ExtractJobCompanyNameError,
  ExtractJobDescriptionError,
  ExtractJobInfoError,
  ExtractJobNumbersError,
  ExtractOccupationError,
  ExtractQualificationsError,
  ExtractReceivedDateError,
  type ExtractTextContentError,
  ExtractWageError,
  ExtractWorkingHoursError,
  ExtractWorkPlaceError,
} from "./error";
import {
  validateCompanyName,
  validateEmployeeCount,
  validateEmploymentType,
  validateExpiryDate,
  validateHomePage,
  validateJobDescription,
  validateJobNumber,
  validateOccupation,
  validateQualification,
  validateReceivedDate,
  validateWage,
  validateWorkingHours,
  validateWorkPlace,
} from "../validators";
import type { JobDetailPropertyValidationError } from "../validators/error";
import { homePageElmExists, qualificationsElmExists } from "../checkers";
import type {
  HomePageElmNotFoundError,
  QualificationsElmNotFoundError,
} from "../checkers/error";

export function extractJobNumbers(jobOverviewList: JobOverViewList) {
  return Effect.forEach(jobOverviewList, (table) => {
    return Effect.gen(function* () {
      const rawJobNumber = yield* Effect.tryPromise({
        try: async () => {
          const text = await table
            .locator("div.right-side")
            .locator("tr")
            .nth(3)
            .locator("td")
            .nth(1)
            .textContent();
          return text;
        },
        catch: (e) =>
          new ExtractJobNumbersError({
            message: `unexpected error. ${String(e)}`,
          }),
      });
      if (rawJobNumber === null) {
        return yield* Effect.fail(
          new ExtractJobNumbersError({ message: "jobNumber is null" }),
        );
      }
      const trimedRawJobNumber = rawJobNumber.trim();
      const jobNumber = yield* validateJobNumber(trimedRawJobNumber);
      return jobNumber;
    });
  });
}

function extractJobNumber(page: JobDetailPage) {
  return Effect.gen(function* () {
    const jobNumberLoc = page.locator("#ID_kjNo");
    const rawJobNumber = yield* Effect.tryPromise({
      try: async () => {
        const rawJobNumber = await jobNumberLoc.textContent();
        return rawJobNumber;
      },
      catch: (e) =>
        new ExtractJobInfoError({
          message: `unexpected error.\n${String(e)}`,
        }),
    });
    const jobNumber = yield* validateJobNumber(rawJobNumber);
    return jobNumber;
  });
}
function extractCompanyName(page: JobDetailPage) {
  return Effect.gen(function* () {
    const rawCompanyName = yield* Effect.tryPromise({
      try: async () => {
        const companyNameLoc = page.locator("#ID_jgshMei");
        const text = await companyNameLoc.textContent();
        return text;
      },
      catch: (e) =>
        e instanceof ZodError
          ? new ExtractJobCompanyNameError({
              message: e.message,
            })
          : new ExtractJobCompanyNameError({
              message: `unexpected error.\n${String(e)}`,
            }),
    });
    const companyName = yield* validateCompanyName(rawCompanyName);
    return companyName;
  });
}
function extractReceivedDate(page: JobDetailPage) {
  return Effect.gen(function* () {
    const receivedDateLoc = page.locator("#ID_uktkYmd");
    const rawReceivedDate = yield* Effect.tryPromise({
      try: async () => {
        const text = await receivedDateLoc.textContent();
        return text;
      },
      catch: (e) =>
        new ExtractReceivedDateError({
          message: `unexpected error.\n${String(e)}`,
        }),
    });
    if (!rawReceivedDate)
      return yield* Effect.fail(
        new ExtractReceivedDateError({
          message: "received date textContent is null",
        }),
      );
    yield* Effect.logDebug(`rawReceivedDate=${rawReceivedDate}`);
    const receivedDate = yield* validateReceivedDate(rawReceivedDate);
    return receivedDate;
  });
}
function extractExpiryDate(page: JobDetailPage) {
  return Effect.gen(function* () {
    const expiryDateLoc = page.locator("#ID_shkiKigenHi");
    const rawExpiryDate = yield* Effect.tryPromise({
      try: async () => {
        const text = await expiryDateLoc.textContent();
        return text;
      },
      catch: (e) =>
        new ExtractExpiryDateError({
          message: `unexpected error.\n${String(e)}`,
        }),
    });
    const expiryDate = yield* validateExpiryDate(rawExpiryDate);
    return expiryDate;
  });
}
function extractHomePage(page: JobDetailPage) {
  return Effect.gen(function* () {
    const homePageLoc = page.locator("#ID_hp");
    const rawHomePage = yield* Effect.tryPromise({
      try: async () => {
        const text = await homePageLoc.textContent();
        return text;
      },
      catch: (e) =>
        new ExtractHomePageError({
          message: `unexpected error.\n${String(e)}`,
        }),
    });
    const homePage = yield* validateHomePage(rawHomePage?.trim());
    return homePage;
  });
}
function extractOccupation(page: JobDetailPage) {
  return Effect.gen(function* () {
    const rawOccupation = yield* Effect.tryPromise({
      try: async () => {
        const occupationLoc = page.locator("#ID_sksu");
        const text = await occupationLoc.textContent();
        return text;
      },
      catch: (e) =>
        new ExtractOccupationError({
          message: `unexpected error.\n${String(e)}`,
        }),
    });
    const occupation = yield* validateOccupation(rawOccupation);
    return occupation;
  });
}
function extractEmploymentType(page: JobDetailPage) {
  return Effect.gen(function* () {
    const rawEmplomentType = yield* Effect.tryPromise({
      try: async () => {
        const employmentTypeLoc = page.locator("#ID_koyoKeitai");

        const text = await employmentTypeLoc.textContent();
        return text;
      },
      catch: (e) =>
        new ExtractEmployMentTypeError({
          message: `unexpected error.\n${String(e)}`,
        }),
    });
    const emplomentType = yield* validateEmploymentType(rawEmplomentType);
    return emplomentType;
  });
}
function extractWage(page: JobDetailPage) {
  return Effect.gen(function* () {
    const rawWage = yield* Effect.tryPromise({
      try: async () => {
        const wageLoc = page.locator("#ID_chgn");
        const text = await wageLoc.textContent();
        return text;
      },
      catch: (e) =>
        new ExtractWageError({ message: `unexpected error.\n${String(e)}` }),
    });
    const wage = yield* validateWage(rawWage);
    return wage;
  });
}
function extractWorkingHours(page: JobDetailPage) {
  return Effect.gen(function* () {
    const rawWorkingHours = yield* Effect.tryPromise({
      try: async () => {
        // 一旦一つだけ
        const workingHoursLoc = page.locator("#ID_shgJn1");
        const text = await workingHoursLoc.textContent();
        return text;
      },
      catch: (e) =>
        new ExtractWorkingHoursError({
          message: `unexpected error.\n${String(e)}`,
        }),
    });
    const workingHours = yield* validateWorkingHours(rawWorkingHours);
    return workingHours;
  });
}

function extractEmployeeCount(page: JobDetailPage) {
  const employeeCountLoc = page.locator("#ID_jgisKigyoZentai");
  return Effect.gen(function* () {
    const rawEmployeeCount = yield* Effect.tryPromise({
      try: async () => {
        const text = await employeeCountLoc.textContent();
        return text;
      },
      catch: (e) =>
        new ExtractEmployeeCountError({
          message: `unexpected error.\n${String(e)}`,
        }),
    });
    yield* Effect.logDebug(`rawEmployeeCount=${rawEmployeeCount}`);
    const employeeCount = yield* validateEmployeeCount(rawEmployeeCount);
    return employeeCount;
  });
}

function extractWorkPlace(page: JobDetailPage) {
  const workPlaceLoc = page.locator("#ID_shgBsJusho");
  return Effect.gen(function* () {
    const rawWorkPlace = yield* Effect.tryPromise({
      try: async () => {
        const text = await workPlaceLoc.textContent();
        return text;
      },
      catch: (e) =>
        new ExtractWorkPlaceError({
          message: `unexpected error,\n${String(e)}`,
        }),
    });
    const workPlace = yield* validateWorkPlace(rawWorkPlace);
    return workPlace;
  });
}

function extractJobDescription(page: JobDetailPage) {
  const jobDescriptionLoc = page.locator("#ID_shigotoNy");
  return Effect.gen(function* () {
    const rawJobDescription = yield* Effect.tryPromise({
      try: async () => {
        const text = await jobDescriptionLoc.textContent();
        return text;
      },
      catch: (e) =>
        new ExtractJobDescriptionError({
          message: `unexpected error.\n${String(e)}`,
        }),
    });
    const jobDescription = yield* validateJobDescription(rawJobDescription);
    return jobDescription;
  });
}

function extractQualifications(page: JobDetailPage) {
  const qualificationsLoc = page.locator("#ID_hynaMenkyoSkku");
  return Effect.gen(function* () {
    const rawQualifications = yield* Effect.tryPromise({
      try: async () => {
        const text = await qualificationsLoc.textContent();
        return text;
      },
      catch: (e) =>
        new ExtractQualificationsError({
          message: `unexpected error.\n${String(e)}`,
        }),
    });
    const qualifications = yield* validateQualification(rawQualifications);
    return qualifications;
  });
}

export function extractJobInfo(
  page: JobDetailPage,
): Effect.Effect<
  ScrapedJob,
  | ExtractTextContentError
  | JobDetailPropertyValidationError
  | HomePageElmNotFoundError
  | QualificationsElmNotFoundError
> {
  return Effect.gen(function* () {
    const jobNumber = yield* extractJobNumber(page);
    const companyName = yield* extractCompanyName(page);
    const receivedDate = yield* extractReceivedDate(page);
    const expiryDate = yield* extractExpiryDate(page);
    // そもそもURLを公開していないことがある
    const homePage = (yield* homePageElmExists(page))
      ? yield* extractHomePage(page)
      : null;
    const occupation = yield* extractOccupation(page);
    const employmentType = yield* extractEmploymentType(page);
    const wage = yield* extractWage(page);
    const workingHours = yield* extractWorkingHours(page);
    const employeeCount = yield* extractEmployeeCount(page);
    const workPlace = yield* extractWorkPlace(page);
    const jobDescription = yield* extractJobDescription(page);
    const qualifications = (yield* qualificationsElmExists(page))
      ? yield* extractQualifications(page)
      : null;
    return {
      jobNumber,
      companyName,
      receivedDate,
      expiryDate,
      homePage,
      occupation,
      employmentType,
      wage,
      workingHours,
      employeeCount,
      workPlace,
      jobDescription,
      qualifications,
    };
  });
}
