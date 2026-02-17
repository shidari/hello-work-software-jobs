import type { JobNumber } from "@sho/models";
import type { SQSRecord } from "aws-lambda";
import { Effect } from "effect";
import * as v from "valibot";
import { issueToLogString } from "../../lib/util";
import {
  FromExtractJobNumberJobQueueEventBodySchemaValidationError,
  JsonParseError,
  ToFirstRecordError,
} from "./error";
import { fromExtractJobNumberHandlerJobQueueEventBodySchema } from "./schema";
import type { TtoFirstRecord } from "./type";

const safeParseFromExtractJobNumberJobQueueEventBodySchema = (val: unknown) => {
  const result = v.safeParse(
    fromExtractJobNumberHandlerJobQueueEventBodySchema,
    val,
  );
  if (!result.success) {
    return Effect.fail(
      new FromExtractJobNumberJobQueueEventBodySchemaValidationError({
        message: `parse failed. detail: ${result.issues.map(issueToLogString).join("\n")}`,
      }),
    );
  }
  return Effect.succeed(result.output);
};

const toFirstRecord: TtoFirstRecord = (records) => {
  return Effect.gen(function* () {
    const record = records.at(0);
    if (records.length !== 1)
      return yield* Effect.fail(
        new ToFirstRecordError({
          message: `record count should be 1 but ${records.length}`,
        }),
      );
    if (!record)
      return yield* Effect.fail(
        new ToFirstRecordError({ message: "record is missing" }),
      );
    return record;
  });
};

export const fromEventToFirstRecord = ({
  Records,
}: {
  Records: SQSRecord[];
}) => {
  return Effect.gen(function* () {
    const record = yield* toFirstRecord(Records);
    const { body } = record;
    const parsed = yield* Effect.try({
      try: () => JSON.parse(body),
      catch: (e) =>
        new JsonParseError({
          message: `parse body to json failed.\n${e instanceof Error ? e.message : String(e)}`,
        }),
    });
    const { jobNumber } =
      yield* safeParseFromExtractJobNumberJobQueueEventBodySchema(parsed);
    return jobNumber as JobNumber;
  });
};
