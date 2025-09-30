import type { JobNumber } from "@sho/models";
import type { SQSEvent, SQSRecord } from "aws-lambda";
import type { Effect } from "effect";
import type { SafeParseEventBodyError, ToFirstRecordError } from "./error";

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONArray
  | JSONObject;

interface JSONObject {
  [key: string]: JSONValue;
}

interface JSONArray extends Array<JSONValue> { }

export type TtoJobNumber = (
  event: SQSEvent,
) => Effect.Effect<JobNumber, SafeParseEventBodyError | ToFirstRecordError>;
export type TtoFirstRecord = (
  records: SQSRecord[],
) => Effect.Effect<SQSRecord, ToFirstRecordError>;
