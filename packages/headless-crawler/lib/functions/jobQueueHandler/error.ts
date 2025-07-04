import { Data } from "effect";

export class SafeParseEventBodyError extends Data.TaggedError(
  "SafeParseEventBodyError",
)<{
  readonly message: string;
}> {}
export class ToFirstRecordError extends Data.TaggedError("ToFirstRecordError")<{
  readonly message: string;
}> {}
export class ParseEmployeeCountError extends Data.TaggedError(
  "ParseEmployeeCountError",
)<{
  readonly message: string;
}> {}
export class ParseReceivedDateError extends Data.TaggedError(
  "ParseReceivedDateError",
)<{
  readonly message: string;
}> {}
export class ParseExpiryDateError extends Data.TaggedError(
  "ParseExpiryDateError",
)<{
  readonly message: string;
}> {}
export class ParseWageError extends Data.TaggedError("ParseWageError")<{
  readonly message: string;
}> {}
export class ParsedWorkingHoursError extends Data.TaggedError(
  "ParsedWorkingHoursError",
)<{
  readonly message: string;
}> {}
