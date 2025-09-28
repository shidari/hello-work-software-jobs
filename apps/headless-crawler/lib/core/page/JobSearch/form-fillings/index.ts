import type {
  DirtyWorkLocation,
  EmploymentType,
  EmploymentTypeSelector,
  EngineeringLabel,
  EngineeringLabelSelector,
  EngineeringLabelSelectorOpenerSibling,
  EngineeringLabelSelectorRadioBtn,
  JobNumber,
  JobSearchCriteria,
  JobSearchPage,
  SearchPeriod,
} from "@sho/models";
import { Effect } from "effect";
import {
  EmploymentLabelToSelectorError,
  EngineeringLabelSelectorError,
  FillJobNumberError,
  FillJobPeriodError,
  FillOccupationFieldError,
  FillPrefectureFieldError,
  FillWorkTypeError,
} from "./error";

function fillWorkType(page: JobSearchPage, employmentType: EmploymentType) {
  return Effect.gen(function* () {
    const selector = yield* employmentLabelToSelector(employmentType);
    yield* Effect.tryPromise({
      try: async () => {
        await page.locator(selector).check();
      },
      catch: (_e) =>
        new FillWorkTypeError({
          message: `Error: invalid employmentType: ${employmentType}`,
        }),
    }).pipe(Effect.tap(() => {
      return Effect.logDebug(`filled work type field. employmentType=${employmentType}`);
    }));
  });
}

function fillPrefectureField(
  page: JobSearchPage,
  workLocation: DirtyWorkLocation,
) {
  const { prefecture } = workLocation;
  return Effect.gen(function* () {
    yield* Effect.logDebug(
      `fill PrefectureField.\nworkLocation: ${JSON.stringify(workLocation, null, 2)}`,
    );
    yield* Effect.tryPromise({
      try: async () => {
        const prefectureSelector = page.locator("#ID_tDFK1CmbBox");
        await prefectureSelector.selectOption(prefecture);
      },
      catch: (e) =>
        new FillPrefectureFieldError({
          message: `Error: workLocation=${workLocation} ${String(e)}`,
        }),
    }).pipe(Effect.tap(() => {
      return Effect.logDebug(`filled prefecture field. prefecture=${prefecture}`);
    }));
  });
}

function fillOccupationField(page: JobSearchPage, label: EngineeringLabel) {
  return Effect.gen(function* () {
    const selector = yield* engineeringLabelToSelector(label);
    yield* Effect.logDebug(
      `will execute fillOccupationField\nlabel=${label}\nselector=${JSON.stringify(selector, null, 2)}`,
    );
    yield* Effect.tryPromise({
      try: async () => {
        const firstoccupationSelectionBtn = page
          .locator("#ID_Btn", { hasText: /職種を選択/ })
          .first();
        await firstoccupationSelectionBtn.click();
        const openerSibling = page.locator(selector.openerSibling);
        const opener = openerSibling.locator("..").locator("i.one_i");
        await opener.click();
        const radioBtn = page.locator(selector.radioBtn);
        await radioBtn.click();
        const okBtn = page.locator("#ID_ok3");
        await okBtn.click();
      },
      catch: (e) =>
        new FillOccupationFieldError({
          message: `unexpected Error. label=${label}\n${String(e)}`,
        }),
    }).pipe(Effect.tap(() => {
      return Effect.logDebug(`filled occupation field. label=${label}`);
    }));
  });
}

export function fillJobCriteriaField(
  page: JobSearchPage,
  jobSearchCriteria: JobSearchCriteria,
) {
  const { employmentType, workLocation, desiredOccupation, searchPeriod } =
    jobSearchCriteria;
  return Effect.gen(function* () {
    if (employmentType) yield* fillWorkType(page, employmentType);
    if (workLocation) yield* fillPrefectureField(page, workLocation);
    if (desiredOccupation?.occupationSelection) {
      yield* fillOccupationField(page, desiredOccupation.occupationSelection);
    }
    if (searchPeriod) {
      yield* fillJobPeriod(page, searchPeriod);
    }
  }).pipe(Effect.tap(() => {
    return Effect.logDebug(`filled job criteria fields. criteria=${JSON.stringify(jobSearchCriteria, null, 2)}`);
  }));
}

function engineeringLabelToSelector(
  label: EngineeringLabel,
): Effect.Effect<
  EngineeringLabelSelector,
  EngineeringLabelSelectorError,
  never
> {
  switch (label) {
    case "ソフトウェア開発技術者、プログラマー":
      return Effect.succeed({
        radioBtn: "#ID_skCheck094" as EngineeringLabelSelectorRadioBtn,
        openerSibling: "#ID_skHid09" as EngineeringLabelSelectorOpenerSibling,
      });
    default:
      return Effect.fail(
        new EngineeringLabelSelectorError({
          message: `Error: invalid label=${label}`,
        }),
      );
  }
}

function employmentLabelToSelector(employmentType: EmploymentType) {
  switch (employmentType) {
    case "PartTimeWorker":
      return Effect.succeed("#ID_LippanCKBox2" as EmploymentTypeSelector);
    case "RegularEmployee":
      return Effect.succeed("#ID_LippanCKBox1" as EmploymentTypeSelector);
    default:
      return Effect.fail(
        new EmploymentLabelToSelectorError({
          message: `unknown label: ${employmentType}`,
        }),
      );
  }
}

export function fillJobNumber(page: JobSearchPage, jobNumber: JobNumber) {
  return Effect.tryPromise({
    try: async () => {
      const jobNumberSplits = jobNumber.split("-");
      const firstJobNumber = jobNumberSplits.at(0);
      const secondJobNumber = jobNumberSplits.at(1);
      if (!firstJobNumber)
        throw new FillJobNumberError({
          message: `firstJobnumber undefined. jobNumber=${jobNumber}`,
        });
      if (!secondJobNumber)
        throw new FillJobNumberError({
          message: `secondJobNumber undefined. jobNumber=${jobNumber}`,
        });
      const firstJobNumberInput = page.locator("#ID_kJNoJo1");
      const secondJobNumberInput = page.locator("#ID_kJNoGe1");
      await firstJobNumberInput.fill(firstJobNumber);
      await secondJobNumberInput.fill(secondJobNumber);
    },
    catch: (e) =>
      new FillJobNumberError({
        message: `unexpected error.\njobNumber=${jobNumber}\n${String(e)}`,
      }),
  }).pipe(Effect.tap(() => {
    return Effect.logDebug(`filled job number field. jobNumber=${jobNumber}`);
  }));
}

export function fillJobPeriod(page: JobSearchPage, searchPeriod: SearchPeriod) {
  return Effect.gen(function* () {
    yield* Effect.logDebug(`fillJobPeriod: searchPeriod=${searchPeriod}`);
    const id =
      searchPeriod === "today"
        ? "#ID_newArrivedCKBox1"
        : searchPeriod === "week"
          ? "#ID_newArrivedCKBox2"
          : null;
    id &&
      (yield* Effect.tryPromise({
        try: async () => {
          const locator = page.locator(id);
          locator.check();
        },
        catch: (e) =>
          new FillJobPeriodError({
            message: `Error: searchPeriod=${searchPeriod} ${String(e)}`,
          }),
      }));
  }).pipe(Effect.tap(() => {
    return Effect.logDebug(`filled job period field. searchPeriod=${searchPeriod}`);
  }));
}
