import { Effect } from "effect";
import { parseHTML } from "linkedom";
import {
  validateCompanyName,
  validateEmploymentType,
  validateJobDescription,
  validateOccupation,
  validateQualification,
  validateWorkPlace,
} from "../helpers/validators";
import {
  toTransformedEmployeeCount,
  toTransformedHomePage,
  toTransformedWage,
  toTransformedWorkingHours,
} from "./helper";
import { validateJobNumber } from "../../core/page/others";
import {
  transformExpiryDate,
  transformReceivedDate,
} from "../helpers/transformers";

export class Transformer extends Effect.Service<Transformer>()(
  "jobDetail/transformer",
  {
    succeed: {
      transform: Effect.fn("transform")(function* (rawHtml: string) {
        yield* Effect.logInfo("start transforming raw HTML...");
        const { document } = parseHTML(rawHtml);
        const rawJobNumber = document.querySelector("#ID_kjNo")?.textContent;
        const jobNumber = yield* validateJobNumber(rawJobNumber);
        const rawCompanyName =
          document.querySelector("#ID_jgshMei")?.textContent;
        const companyName = yield* validateCompanyName(rawCompanyName);
        const rawReceivedDate =
          document.querySelector("#ID_uktkYmd")?.textContent;
        const receivedDate = yield* transformReceivedDate(rawReceivedDate);
        const rawExpiryDate =
          document.querySelector("#ID_shkiKigenHi")?.textContent;
        const expiryDate = yield* transformExpiryDate(rawExpiryDate);
        const rawHomePage = document.querySelector("#ID_hp")?.textContent;
        const homePage = rawHomePage
          ? yield* toTransformedHomePage(rawHomePage)
          : undefined;
        const rawOccupation = document.querySelector("#ID_sksu")?.textContent;
        const occupation = yield* validateOccupation(rawOccupation);
        const rawEmplomentType =
          document.querySelector("#ID_koyoKeitai")?.textContent;
        const employmentType = yield* validateEmploymentType(rawEmplomentType);
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
        const jobDescription = yield* validateJobDescription(rawJobDescription);
        const rawQualifications =
          document.querySelector("#ID_hynaMenkyoSkku")?.textContent;
        const qualifications = yield* validateQualification(rawQualifications);
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
    },
  },
) {}
