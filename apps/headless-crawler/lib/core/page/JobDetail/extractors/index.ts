import type { JobDetailPage, JobOverViewList, ScrapedJob } from "@sho/models";
import { Effect } from "effect";
import * as v from "valibot";
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
      }).pipe(Effect.tap((raw) => {
        if (raw === null) {
          return Effect.logDebug("Warning: jobNumber textContent is null");
        }
        return Effect.logDebug(`rawJobNumber=${raw}`);
      }));
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
    yield* Effect.logDebug(`rawJobNumber=${rawJobNumber}`);
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
        e instanceof v.ValiError
          ? new ExtractJobCompanyNameError({
            message: e.message,
          })
          : new ExtractJobCompanyNameError({
            message: `unexpected error.\n${String(e)}`,
          }),
    });
    yield* Effect.logDebug(`rawCompanyName=${rawCompanyName}`);
    const companyName = yield* validateCompanyName(rawCompanyName);
    yield* Effect.logDebug(`companyName=${companyName}`);
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
    yield* Effect.logDebug(`rawReceivedDate=${rawReceivedDate}`);
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
    yield* Effect.logDebug(`rawExpiryDate=${rawExpiryDate}`);
    const expiryDate = yield* validateExpiryDate(rawExpiryDate);
    yield* Effect.logDebug(`expiryDate=${expiryDate}`);
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
    yield* Effect.logDebug(`rawHomePage=${rawHomePage}`);
    const homePage = yield* validateHomePage(rawHomePage?.trim());
    yield* Effect.logDebug(`homePage=${homePage}`);
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
    yield* Effect.logDebug(`rawOccupation=${rawOccupation}`);
    const occupation = yield* validateOccupation(rawOccupation);
    yield* Effect.logDebug(`occupation=${occupation}`);
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
    yield* Effect.logDebug(`rawEmplomentType=${rawEmplomentType}`);
    const emplomentType = yield* validateEmploymentType(rawEmplomentType);
    yield* Effect.logDebug(`emplomentType=${emplomentType}`);
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
    yield* Effect.logDebug(`rawWage=${rawWage}`);
    const wage = yield* validateWage(rawWage);
    yield* Effect.logDebug(`wage=${wage}`);
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
    yield* Effect.logDebug(`rawWorkingHours=${rawWorkingHours}`);
    const workingHours = yield* validateWorkingHours(rawWorkingHours);
    yield* Effect.logDebug(`workingHours=${workingHours}`);
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
    yield* Effect.logDebug(`employeeCount=${employeeCount}`);
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
    yield* Effect.logDebug(`rawWorkPlace=${rawWorkPlace}`);
    const workPlace = yield* validateWorkPlace(rawWorkPlace);
    yield* Effect.logDebug(`workPlace=${workPlace}`);
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
    yield* Effect.logDebug(`rawJobDescription=${rawJobDescription}`);
    const jobDescription = yield* validateJobDescription(rawJobDescription);
    yield* Effect.logDebug(`jobDescription=${jobDescription}`);
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
    yield* Effect.logDebug(`rawQualifications=${rawQualifications}`);
    const qualifications = yield* validateQualification(rawQualifications);
    yield* Effect.logDebug(`qualifications=${qualifications}`);
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
    yield* Effect.logDebug("Starting to extract job info from JobDetailPage");
    const jobNumber = yield* extractJobNumber(page);
    yield* Effect.logDebug(`jobNumber=${jobNumber}`);
    const companyName = yield* extractCompanyName(page);
    yield* Effect.logDebug(`companyName=${companyName}`);
    const receivedDate = yield* extractReceivedDate(page);
    yield* Effect.logDebug(`receivedDate=${receivedDate}`);
    const expiryDate = yield* extractExpiryDate(page);
    yield* Effect.logDebug(`expiryDate=${expiryDate}`);
    // そもそもURLを公開していないことがある
    const homePage = (yield* homePageElmExists(page))
      ? yield* extractHomePage(page)
      : null;
    yield* Effect.logDebug(`homePage=${homePage}`);
    const occupation = yield* extractOccupation(page);
    yield* Effect.logDebug(`occupation=${occupation}`);
    const employmentType = yield* extractEmploymentType(page);
    yield* Effect.logDebug(`employmentType=${employmentType}`);
    const wage = yield* extractWage(page);
    yield* Effect.logDebug(`wage=${wage}`);
    const workingHours = yield* extractWorkingHours(page);
    yield* Effect.logDebug(`workingHours=${workingHours}`);
    const employeeCount = yield* extractEmployeeCount(page);
    yield* Effect.logDebug(`employeeCount=${employeeCount}`);
    const workPlace = yield* extractWorkPlace(page);
    yield* Effect.logDebug(`workPlace=${workPlace}`);
    const jobDescription = yield* extractJobDescription(page);
    yield* Effect.logDebug(`jobDescription=${jobDescription}`);
    const qualifications = (yield* qualificationsElmExists(page))
      ? yield* extractQualifications(page)
      : null;
    yield* Effect.logDebug(`qualifications=${qualifications}`);
    yield* Effect.logDebug("Finished extracting job info from JobDetailPage");
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
