import type { SQSRecord } from "aws-lambda";
import type { Effect } from "effect";
import type { ToFirstRecordError } from "./error";

export type TtoFirstRecord = (
  records: SQSRecord[],
) => Effect.Effect<SQSRecord, ToFirstRecordError>;
