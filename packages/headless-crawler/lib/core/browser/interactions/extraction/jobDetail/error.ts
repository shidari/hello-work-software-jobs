import { Data } from "effect";

export class ExtractJobInfoError extends Data.TaggedError(
  "ExtractJobInfoError",
)<{ readonly message: string }> {}
export class ExtractJobCompanyNameError extends Data.TaggedError(
  "ExtractJobCompanyName",
)<{ readonly message: string }> {}
export class ExtractReceivedDateError extends Data.TaggedError(
  "ExtractReceivedDateError",
)<{ readonly message: string }> {}
export class ExtractExpiryDateError extends Data.TaggedError(
  "ExtractExpiryDateError",
)<{ readonly message: string }> {}
export class ExtractHomePageError extends Data.TaggedError(
  "ExtractHomePageError",
)<{ readonly message: string }> {}
export class ExtractOccupationError extends Data.TaggedError(
  "ExtractOccupationError",
)<{ readonly message: string }> {}
export class ExtractEmployMentTypeError extends Data.TaggedError(
  "ExtractEmployMentTypeError",
)<{ readonly message: string }> {}
export class ExtractWageError extends Data.TaggedError("ExtractWageError")<{
  readonly message: string;
}> {}
export class ExtractWorkingHoursError extends Data.TaggedError(
  "ExtractWorkingHoursError",
)<{
  readonly message: string;
}> {}
export class ExtractEmployeeCountError extends Data.TaggedError(
  "ExtractEmployeeCountError",
)<{
  readonly message: string;
}> {}
export class ExtractWorkPlaceError extends Data.TaggedError(
  "ExtractWorkPlaceError",
)<{
  readonly message: string;
}> {}
export class ExtractJobDescriptionError extends Data.TaggedError(
  "ExtractJobDescriptionError",
)<{
  readonly message: string;
}> {}
export class ExtractQualificationsError extends Data.TaggedError(
  "ExtractQualificationsError",
)<{
  readonly message: string;
}> {}

export class ExtractJobNumbersError extends Data.TaggedError(
  "ExtractJobNumbersError",
)<{ readonly message: string }> {}

export type ExtractTextContentError =
  | ExtractJobInfoError
  | ExtractJobCompanyNameError
  | ExtractReceivedDateError
  | ExtractExpiryDateError
  | ExtractHomePageError
  | ExtractOccupationError
  | ExtractEmployMentTypeError
  | ExtractWageError
  | ExtractWorkingHoursError
  | ExtractEmployeeCountError
  | ExtractWorkPlaceError
  | ExtractJobDescriptionError
  | ExtractQualificationsError;
