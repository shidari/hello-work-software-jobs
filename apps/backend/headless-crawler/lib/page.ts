import type {
  DirtyWorkLocation,
  EmploymentType,
  EmploymentTypeSelector,
  EngineeringLabel,
  EngineeringLabelSelector,
  EngineeringLabelSelectorOpenerSibling,
  EngineeringLabelSelectorRadioBtn,
  JobSearchCriteria,
  SearchPeriod,
} from "@sho/models";
import { Data, Effect } from "effect";
import type { Page } from "playwright";
import { PlaywrightChromiumPageResource } from "./browser";

// ============================================================
// Errors
// ============================================================

class JobSearchPageServiceError extends Data.TaggedError(
  "JobSearchPageServiceError",
)<{ readonly message: string }> {}

class FirstJobListPageNavigatorError extends Data.TaggedError(
  "FirstJobListPageNavigatorError",
)<{ readonly message: string }> {}

// ============================================================
// Types
// ============================================================

const _jobSearchPage: unique symbol = Symbol("JobSearchPage");
export type JobSearchPage = Page & { [_jobSearchPage]: unknown };

const _firstJobListPage: unique symbol = Symbol("FirstJobListPage");
export type FirstJobListPage = Page & { [_firstJobListPage]: unknown };

// ============================================================
// Services
// ============================================================

export class JobSearchPageService extends Effect.Service<JobSearchPageService>()(
  "JobSearchPageService",
  {
    effect: Effect.gen(function* () {
      const { page } = yield* PlaywrightChromiumPageResource;
      yield* Effect.tryPromise({
        try: async () => {
          await page.goto(
            "https://www.hellowork.mhlw.go.jp/kensaku/GECA110010.do?action=initDisp&screenId=GECA110010",
          );
        },
        catch: (e) =>
          new JobSearchPageServiceError({
            message: `unexpected error.\n${String(e)}`,
          }),
      }).pipe(
        Effect.tap(() => Effect.logDebug("navigated to job search page.")),
      );

      // ---- selector helpers (pure) ----

      function employmentLabelToSelector(
        employmentType: EmploymentType,
      ): Effect.Effect<EmploymentTypeSelector, JobSearchPageServiceError> {
        switch (employmentType) {
          case "PartTimeWorker":
            return Effect.succeed("#ID_LippanCKBox2" as EmploymentTypeSelector);
          case "RegularEmployee":
            return Effect.succeed("#ID_LippanCKBox1" as EmploymentTypeSelector);
          default:
            return Effect.fail(
              new JobSearchPageServiceError({
                message: `unknown employment type: ${employmentType}`,
              }),
            );
        }
      }

      function engineeringLabelToSelector(
        label: EngineeringLabel,
      ): Effect.Effect<EngineeringLabelSelector, JobSearchPageServiceError> {
        switch (label) {
          case "ソフトウェア開発技術者、プログラマー":
            return Effect.succeed({
              radioBtn: "#ID_skCheck094" as EngineeringLabelSelectorRadioBtn,
              openerSibling:
                "#ID_skHid09" as EngineeringLabelSelectorOpenerSibling,
            });
          default:
            return Effect.fail(
              new JobSearchPageServiceError({
                message: `Error: invalid label=${label}`,
              }),
            );
        }
      }

      // ---- form filling Effect.fn ----

      const fillWorkType = Effect.fn("fillWorkType")(function* (
        employmentType: EmploymentType,
      ) {
        const selector = yield* employmentLabelToSelector(employmentType);
        yield* Effect.tryPromise({
          try: async () => {
            await page.locator(selector).check();
          },
          catch: (_e) =>
            new JobSearchPageServiceError({
              message: `Error: invalid employmentType: ${employmentType}`,
            }),
        }).pipe(
          Effect.tap(() =>
            Effect.logDebug(
              `filled work type field. employmentType=${employmentType}`,
            ),
          ),
        );
      });

      const fillPrefectureField = Effect.fn("fillPrefectureField")(function* (
        workLocation: DirtyWorkLocation,
      ) {
        const { prefecture } = workLocation;
        yield* Effect.logDebug(
          `fill PrefectureField.\nworkLocation: ${JSON.stringify(workLocation, null, 2)}`,
        );
        yield* Effect.tryPromise({
          try: async () => {
            const prefectureSelector = page.locator("#ID_tDFK1CmbBox");
            await prefectureSelector.selectOption(prefecture);
          },
          catch: (e) =>
            new JobSearchPageServiceError({
              message: `Error: workLocation=${workLocation} ${String(e)}`,
            }),
        }).pipe(
          Effect.tap(() =>
            Effect.logDebug(
              `filled prefecture field. prefecture=${prefecture}`,
            ),
          ),
        );
      });

      const fillOccupationField = Effect.fn("fillOccupationField")(function* (
        label: EngineeringLabel,
      ) {
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
            new JobSearchPageServiceError({
              message: `unexpected Error. label=${label}\n${String(e)}`,
            }),
        }).pipe(
          Effect.tap(() =>
            Effect.logDebug(`filled occupation field. label=${label}`),
          ),
        );
      });

      const fillJobPeriod = Effect.fn("fillJobPeriod")(function* (
        searchPeriod: SearchPeriod,
      ) {
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
              new JobSearchPageServiceError({
                message: `Error: searchPeriod=${searchPeriod} ${String(e)}`,
              }),
          }));
      });

      const fillJobCriteriaField = Effect.fn("fillJobCriteriaField")(function* (
        criteria: JobSearchCriteria,
      ) {
        const {
          employmentType,
          workLocation,
          desiredOccupation,
          searchPeriod,
        } = criteria;
        if (employmentType) yield* fillWorkType(employmentType);
        if (workLocation) yield* fillPrefectureField(workLocation);
        if (desiredOccupation?.occupationSelection) {
          yield* fillOccupationField(desiredOccupation.occupationSelection);
        }
        if (searchPeriod) yield* fillJobPeriod(searchPeriod);
      });

      // ---- search button Effect.fn ----

      const clickSearchNoBtn = Effect.fn("clickSearchNoBtn")(function* () {
        yield* Effect.tryPromise({
          try: async () => {
            const searchNoBtn = page.locator("#ID_searchNoBtn");
            await Promise.all([
              page.waitForURL("**/kensaku/*.do"),
              searchNoBtn.click(),
            ]);
          },
          catch: (e) =>
            new JobSearchPageServiceError({
              message: `unexpected error.\n${String(e)}`,
            }),
        }).pipe(
          Effect.tap(() =>
            Effect.logDebug("navigated to job list page from job search page."),
          ),
        );
      });

      const clickSearchBtn = Effect.fn("clickSearchBtn")(function* () {
        yield* Effect.tryPromise({
          try: async () => {
            const searchBtn = page.locator("#ID_searchBtn");
            await Promise.all([
              page.waitForURL("**/kensaku/*.do"),
              searchBtn.click(),
            ]);
          },
          catch: (e) =>
            new JobSearchPageServiceError({
              message: `unexpected error.\n${String(e)}`,
            }),
        }).pipe(
          Effect.tap(() =>
            Effect.logDebug("navigated to job list page from job search page."),
          ),
        );
      });

      return {
        page: page as JobSearchPage,
        clickSearchNoBtn,
        clickSearchBtn,
        fillJobCriteriaField,
      };
    }),
    dependencies: [PlaywrightChromiumPageResource.Default],
  },
) {}

export class FirstJobListPageNavigator extends Effect.Service<FirstJobListPageNavigator>()(
  "FirstJobListPageNavigator",
  {
    effect: Effect.gen(function* () {
      const { page, clickSearchNoBtn, clickSearchBtn, fillJobCriteriaField } =
        yield* JobSearchPageService;

      const byJobNumber = Effect.fn("byJobNumber")(function* (
        jobNumber: string,
      ) {
        yield* Effect.tryPromise({
          try: async () => {
            const jobNumberSplits = jobNumber.split("-");
            const firstJobNumber = jobNumberSplits.at(0);
            const secondJobNumber = jobNumberSplits.at(1);
            if (!firstJobNumber)
              throw new FirstJobListPageNavigatorError({
                message: `firstJobnumber undefined. jobNumber=${jobNumber}`,
              });
            if (!secondJobNumber)
              throw new FirstJobListPageNavigatorError({
                message: `secondJobNumber undefined. jobNumber=${jobNumber}`,
              });
            const firstJobNumberInput = page.locator("#ID_kJNoJo1");
            const secondJobNumberInput = page.locator("#ID_kJNoGe1");
            await firstJobNumberInput.fill(firstJobNumber);
            await secondJobNumberInput.fill(secondJobNumber);
          },
          catch: (e) =>
            new FirstJobListPageNavigatorError({
              message: `unexpected error.\njobNumber=${jobNumber}\n${String(e)}`,
            }),
        }).pipe(
          Effect.tap(() =>
            Effect.logDebug(`filled job number field. jobNumber=${jobNumber}`),
          ),
        );
        yield* clickSearchNoBtn();
        return page as unknown as FirstJobListPage;
      });

      const byCriteria = Effect.fn("byCriteria")(function* (
        criteria: JobSearchCriteria,
      ) {
        yield* fillJobCriteriaField(criteria);
        yield* clickSearchBtn();
        return page as unknown as FirstJobListPage;
      });

      return { byJobNumber, byCriteria };
    }),
    dependencies: [JobSearchPageService.Default],
  },
) {}
