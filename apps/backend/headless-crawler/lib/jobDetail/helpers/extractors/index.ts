import type { JobDetailPage } from "@sho/models";
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
  ExtractOccupationError,
  ExtractQualificationsError,
  ExtractReceivedDateError,
  ExtractWageError,
  ExtractWorkingHoursError,
  ExtractWorkPlaceError,
} from "./error";
import {
  validateCompanyName,
  validateEmployeeCount,
  validateEmploymentType,
  validateExpiryDate,
  validateRawHomePage,
  validateJobDescription,
  validateOccupation,
  validateQualification,
  validateReceivedDate,
  validateWage,
  validateWorkingHours,
  validateWorkPlace,
} from "../validators";
import { homePageElmExists, qualificationsElmExists } from "../checkers";
import { validateJobNumber } from "../../../core/page/others";

function extractJobNumber(page: JobDetailPage) {
  const selector = "#ID_kjNo";
  return Effect.gen(function* () {
    const jobNumberLoc = page.locator(selector);
    const rawJobNumber = yield* Effect.tryPromise({
      try: async () => {
        const rawJobNumber = await jobNumberLoc.textContent();
        return rawJobNumber;
      },
      catch: (e) =>
        new ExtractJobInfoError({
          reason: `${e instanceof Error ? e.message : String(e)}`,
          currentUrl: page.url(),
          selector,
        }),
    });
    yield* Effect.logDebug(`rawJobNumber=${rawJobNumber}`);
    const jobNumber = yield* validateJobNumber(rawJobNumber);
    return jobNumber;
  });
}
function extractCompanyName(page: JobDetailPage) {
  const selector = "#ID_jgshMei";
  return Effect.gen(function* () {
    const rawCompanyName = yield* Effect.tryPromise({
      try: async () => {
        const companyNameLoc = page.locator(selector);
        const text = await companyNameLoc.textContent();
        return text;
      },
      catch: (e) =>
        e instanceof v.ValiError
          ? new ExtractJobCompanyNameError({
              reason: e.message,
              currentUrl: page.url(),
              selector,
            })
          : new ExtractJobCompanyNameError({
              reason: `${e instanceof Error ? e.message : String(e)}`,
              currentUrl: page.url(),
              selector,
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
          reason: `${e instanceof Error ? e.message : String(e)}`,
          currentUrl: page.url(),
          selector: "#ID_uktkYmd",
        }),
    });
    yield* Effect.logDebug(`rawReceivedDate=${rawReceivedDate}`);
    if (!rawReceivedDate)
      return yield* Effect.fail(
        new ExtractReceivedDateError({
          reason: "received date textContent is null",
          currentUrl: page.url(),
          selector: "#ID_uktkYmd",
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
          reason: `${e instanceof Error ? e.message : String(e)}`,
          currentUrl: page.url(),
          selector: "#ID_shkiKigenHi",
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
          reason: `${e instanceof Error ? e.message : String(e)}`,
          currentUrl: page.url(),
          selector: "#ID_hp",
        }),
    });
    yield* Effect.logDebug(`rawHomePage=${rawHomePage}`);
    const homePage = yield* validateRawHomePage(rawHomePage?.trim());
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
          reason: `${e instanceof Error ? e.message : String(e)}`,
          currentUrl: page.url(),
          selector: "#ID_sksu",
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
          reason: `${e instanceof Error ? e.message : String(e)}`,
          currentUrl: page.url(),
          selector: "#ID_koyoKeitai",
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
        new ExtractWageError({
          reason: `${e instanceof Error ? e.message : String(e)}`,
          currentUrl: page.url(),
          selector: "#ID_chgn",
        }),
    });
    yield* Effect.logDebug(`rawWage=${rawWage}`);
    const wage = yield* validateWage(rawWage);
    yield* Effect.logDebug(`wage=${wage}`);
    return wage;
  });
}
function extractWorkingHours(page: JobDetailPage) {
  const selector = "#ID_shgJn1";
  return Effect.gen(function* () {
    const rawWorkingHours = yield* Effect.tryPromise({
      try: async () => {
        // 一旦一つだけ
        const workingHoursLoc = page.locator(selector);
        const text = await workingHoursLoc.textContent();
        return text;
      },
      catch: (e) =>
        new ExtractWorkingHoursError({
          reason: `${e instanceof Error ? e.message : String(e)}`,
          currentUrl: page.url(),
          selector,
        }),
    });
    yield* Effect.logDebug(`rawWorkingHours=${rawWorkingHours}`);
    const workingHours = yield* validateWorkingHours(rawWorkingHours);
    yield* Effect.logDebug(`workingHours=${workingHours}`);
    return workingHours;
  });
}

function extractEmployeeCount(page: JobDetailPage) {
  const selector = "#ID_jgisKigyoZentai";
  const employeeCountLoc = page.locator(selector);
  return Effect.gen(function* () {
    const rawEmployeeCount = yield* Effect.tryPromise({
      try: async () => {
        const text = await employeeCountLoc.textContent();
        return text;
      },
      catch: (e) =>
        new ExtractEmployeeCountError({
          reason: `${e instanceof Error ? e.message : String(e)}`,
          currentUrl: page.url(),
          selector,
        }),
    });
    yield* Effect.logDebug(`rawEmployeeCount=${rawEmployeeCount}`);
    const employeeCount = yield* validateEmployeeCount(rawEmployeeCount);
    yield* Effect.logDebug(`employeeCount=${employeeCount}`);
    return employeeCount;
  });
}

function extractWorkPlace(page: JobDetailPage) {
  const selector = "#ID_shgBsJusho";
  const workPlaceLoc = page.locator(selector);
  return Effect.gen(function* () {
    const rawWorkPlace = yield* Effect.tryPromise({
      try: async () => {
        const text = await workPlaceLoc.textContent();
        return text;
      },
      catch: (e) =>
        new ExtractWorkPlaceError({
          reason: `${e instanceof Error ? e.message : String(e)}`,
          currentUrl: page.url(),
          selector,
        }),
    });
    yield* Effect.logDebug(`rawWorkPlace=${rawWorkPlace}`);
    const workPlace = yield* validateWorkPlace(rawWorkPlace);
    yield* Effect.logDebug(`workPlace=${workPlace}`);
    return workPlace;
  });
}

function extractJobDescription(page: JobDetailPage) {
  const selector = "#ID_shigotoNy";
  const jobDescriptionLoc = page.locator(selector);
  return Effect.gen(function* () {
    const rawJobDescription = yield* Effect.tryPromise({
      try: async () => {
        const text = await jobDescriptionLoc.textContent();
        return text;
      },
      catch: (e) =>
        new ExtractJobDescriptionError({
          reason: `${e instanceof Error ? e.message : String(e)}`,
          currentUrl: page.url(),
          selector,
        }),
    });
    yield* Effect.logDebug(`rawJobDescription=${rawJobDescription}`);
    const jobDescription = yield* validateJobDescription(rawJobDescription);
    yield* Effect.logDebug(`jobDescription=${jobDescription}`);
    return jobDescription;
  });
}

function extractQualifications(page: JobDetailPage) {
  const selector = "#ID_hynaMenkyoSkku";
  const qualificationsLoc = page.locator(selector);
  return Effect.gen(function* () {
    const rawQualifications = yield* Effect.tryPromise({
      try: async () => {
        const text = await qualificationsLoc.textContent();
        return text;
      },
      catch: (e) =>
        new ExtractQualificationsError({
          reason: `${e instanceof Error ? e.message : String(e)}`,
          currentUrl: page.url(),
          selector,
        }),
    });
    yield* Effect.logDebug(`rawQualifications=${rawQualifications}`);
    const qualifications = yield* validateQualification(rawQualifications);
    yield* Effect.logDebug(`qualifications=${qualifications}`);
    return qualifications;
  });
}

export function extractJobInfo(page: JobDetailPage) {
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
