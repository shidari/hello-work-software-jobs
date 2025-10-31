import {
  transformedEmployeeCountSchema,
  transformedHomePageSchema,
  transformedWageSchema,
  transformedWorkingHoursSchema,
} from "@sho/models";
import { Effect } from "effect";
import { safeParse } from "valibot";
import {
  EmployeeCountTransformationError,
  HomePageTransformationError,
  WageTransformationError,
  WorkingHoursTransformationError,
} from "./error";
import { issueToLogString } from "../../core/util";

export const toTransformedWage = (val: unknown) => {
  const result = safeParse(transformedWageSchema, val);
  if (!result.success) {
    return Effect.fail(
      new WageTransformationError({
        reason: ` ${result.issues.map(issueToLogString).join("\n")}`,
        serializedVal: JSON.stringify(val, null, 2),
      }),
    );
  }
  return Effect.succeed(result.output);
};

export const toTransformedWorkingHours = (val: unknown) => {
  const result = safeParse(transformedWorkingHoursSchema, val);
  if (!result.success) {
    return Effect.fail(
      new WorkingHoursTransformationError({
        reason: `${result.issues.map(issueToLogString).join("\n")}`,
        serializedVal: JSON.stringify(val, null, 2),
      }),
    );
  }
  return Effect.succeed(result.output);
};

export const toTransformedEmployeeCount = (val: unknown) => {
  const result = safeParse(transformedEmployeeCountSchema, val);
  if (!result.success) {
    return Effect.fail(
      new EmployeeCountTransformationError({
        reason: `${result.issues.map(issueToLogString).join("\n")}`,
        serializedVal: JSON.stringify(val, null, 2),
      }),
    );
  }
  return Effect.succeed(result.output);
};

export const toTransformedHomePage = (val: unknown) => {
  const result = safeParse(transformedHomePageSchema, val)
  if (!result.success) {
    return Effect.fail(
      new HomePageTransformationError({
        reason: `${result.issues.map(issueToLogString).join("\n")}`,
        serializedVal: JSON.stringify(val, null, 2),
      }),
    );
  }
  return Effect.succeed(result.output);
}
