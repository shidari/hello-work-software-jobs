import { Effect } from "effect";
import * as v from "valibot";
import {
  ExpiryDateTransformationError,
  ReceivedDateTransformationError,
} from "./error";
import { issueToLogString } from "../../../core/util";
import {
  transformedExpiryDateToISOStrSchema,
  transformedReceivedDateToISOStrSchema,
} from "@sho/models";
export function transformReceivedDate(val: unknown) {
  return Effect.gen(function* () {
    const result = v.safeParse(transformedReceivedDateToISOStrSchema, val);
    if (!result.success) {
      return yield* Effect.fail(
        new ReceivedDateTransformationError({
          message: `transformation error. detail: ${result.issues.map(issueToLogString).join("\n")}`,
        }),
      ).pipe(
        Effect.tap(() => {
          Effect.logDebug(
            `failed to transform receivedDate. detail: ${result.issues.map(issueToLogString).join("\n")}`,
          );
        }),
      );
    }
    return yield* Effect.succeed(result.output);
  });
}
export function transformExpiryDate(val: unknown) {
  return Effect.gen(function* () {
    const result = v.safeParse(transformedExpiryDateToISOStrSchema, val);
    if (!result.success) {
      return yield* Effect.fail(
        new ExpiryDateTransformationError({
          message: `transformation error. detail: ${result.issues.map(issueToLogString).join("\n")}`,
        }),
      ).pipe(
        Effect.tap(() => {
          Effect.logDebug(
            `failed to transform expiryDate. detail: ${result.issues.map(issueToLogString).join("\n")}`,
          );
        }),
      );
    }
    return yield* Effect.succeed(result.output);
  });
}
