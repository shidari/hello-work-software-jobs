import type { transformedSchema } from "@sho/models";
import { Context, Data, Effect, Layer } from "effect";
import type { NewPageError } from "../../core/headless-browser/error";
import type { JobListPageValidationError } from "../../core/page/JobList/validators/error";
import type { JobSearchPageValidationError } from "../../core/page/JobSearch/validators/error";
import type { ListJobsError } from "../../core/page/others/error";
import type { AssertSingleJobListedError } from "../../core/page/JobList/assertions/error";
import type {
  HomePageElmNotFoundError,
  QualificationsElmNotFoundError,
} from "../helpers/checkers/error";
import type {
  GoToJobSearchPageError,
  SearchThenGotoFirstJobListPageError,
} from "../../core/page/JobSearch/navigations/error";
import type { FromJobListToJobDetailPageError } from "../../core/page/JobList/navigations/error";
import type { ExtractTextContentError } from "../helpers/extractors/error";
import type { JobSearchWithJobNumberFillingError } from "../../core/page/JobSearch/form-fillings/error";
import type {
  JobDetailPageValidationError,
  JobDetailPropertyValidationError,
} from "../helpers/validators/error";
import type { InferOutput } from "valibot";
import { parseHTML } from "linkedom";
import {
  validateCompanyName,
  validateEmploymentType,
  validateExpiryDate,
  validateHomePage,
  validateJobDescription,
  validateOccupation,
  validateQualification,
  validateReceivedDate,
  validateWorkPlace,
} from "../helpers/validators";
import {
  toTransformedEmployeeCount,
  toTransformedWage,
  toTransformedWorkingHours,
} from "./helper";
import type {
  EmployeeCountTransformationError,
  WageTransformationError,
  WorkingHoursTransformationError,
} from "./error";
import { validateJobNumber } from "../../core/page/others";

export class TransformerConfig extends Context.Tag("Config")<
  TransformerConfig,
  {
    readonly getConfig: Effect.Effect<{
      readonly logDebug: boolean;
    }>;
  }
>() {}

export const ConfigLive = Layer.succeed(
  TransformerConfig,
  TransformerConfig.of({
    getConfig: Effect.succeed({
      logDebug: false,
    }),
  }),
);
export class JobDetailTransformer extends Context.Tag("JobDetailTransformer")<
  JobDetailTransformer,
  {
    readonly transform: (
      rawHtml: string,
    ) => Effect.Effect<
      InferOutput<typeof transformedSchema>,
      | ListJobsError
      | ScrapeJobDataError
      | NewPageError
      | AssertSingleJobListedError
      | HomePageElmNotFoundError
      | QualificationsElmNotFoundError
      | GoToJobSearchPageError
      | SearchThenGotoFirstJobListPageError
      | FromJobListToJobDetailPageError
      | JobSearchPageValidationError
      | JobListPageValidationError
      | JobDetailPageValidationError
      | JobDetailPropertyValidationError
      | ExtractTextContentError
      | JobSearchWithJobNumberFillingError
      | WageTransformationError
      | WorkingHoursTransformationError
      | EmployeeCountTransformationError,
      TransformerConfig
    >;
  }
>() {}

export const transformerLive = Layer.effect(
  JobDetailTransformer,
  Effect.gen(function* () {
    const config = yield* TransformerConfig;
    yield* Effect.logInfo(
      `building scraper: config=${JSON.stringify(config, null, 2)}`,
    );
    return JobDetailTransformer.of({
      transform: (rawHtml: string) =>
        Effect.gen(function* () {
          yield* Effect.logInfo(
            `start transforming... config=${JSON.stringify(config, null, 2)}`,
          );
          const { document } = parseHTML(rawHtml);
          const rawJobNumber = document.querySelector("#ID_kjNo")?.textContent;
          const jobNumber = yield* validateJobNumber(rawJobNumber);
          const rawCompanyName =
            document.querySelector("#ID_jgshMei")?.textContent;
          const companyName = yield* validateCompanyName(rawCompanyName);
          const rawReceivedDate =
            document.querySelector("#ID_uktkYmd")?.textContent;
          const receivedDate = yield* validateReceivedDate(rawReceivedDate);
          const rawExpiryDate =
            document.querySelector("#ID_shkiKigenHi")?.textContent;
          const expiryDate = yield* validateExpiryDate(rawExpiryDate);
          const rawHomePage = document.querySelector("#ID_hp")?.textContent;
          const homePage = rawHomePage
            ? yield* validateHomePage(rawHomePage)
            : null;
          const rawOccupation = document.querySelector("#ID_sksu")?.textContent;
          const occupation = yield* validateOccupation(rawOccupation);
          const rawEmplomentType =
            document.querySelector("#ID_koyoKeitai")?.textContent;
          const employmentType =
            yield* validateEmploymentType(rawEmplomentType);
          const rawWage = document.querySelector("#ID_chgn")?.textContent;
          const { wageMax, wageMin } = yield* toTransformedWage(rawWage);
          const rawWorkingHours =
            document.querySelector("#ID_shgJn1")?.textContent;
          const { workingEndTime, workingStartTime } =
            yield* toTransformedWorkingHours(rawWorkingHours);
          const rawEmployeeCount = document.querySelector(
            "#ID_jgisKigyoZentai",
          )?.textContent;
          const employeeCount =
            yield* toTransformedEmployeeCount(rawEmployeeCount);
          const rawWorkPlace =
            document.querySelector("#ID_shgBsJusho")?.textContent;
          const workPlace = yield* validateWorkPlace(rawWorkPlace);
          const rawJobDescription =
            document.querySelector("#ID_shigotoNy")?.textContent;
          const jobDescription =
            yield* validateJobDescription(rawJobDescription);
          const rawQualifications =
            document.querySelector("#ID_hynaMenkyoSkku")?.textContent;
          const qualifications =
            yield* validateQualification(rawQualifications);
          return {
            jobNumber,
            companyName,
            receivedDate,
            expiryDate,
            homePage,
            occupation,
            employmentType,
            wageMax,
            wageMin,
            workingEndTime,
            workingStartTime,
            employeeCount,
            workPlace,
            jobDescription,
            qualifications,
          };
        }),
    });
  }),
);

export const mainLive = transformerLive.pipe(Layer.provide(ConfigLive));

class ScrapeJobDataError extends Data.TaggedError("ScrapeJobDataError")<{
  readonly message: string;
}> {}
