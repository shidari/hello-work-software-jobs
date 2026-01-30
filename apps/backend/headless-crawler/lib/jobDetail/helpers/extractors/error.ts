import { Data } from "effect";

export class ExtractJobInfoError extends Data.TaggedError(
  "ExtractJobInfoError",
)<{
  readonly reason: string;
  readonly currentUrl: string;
  readonly selector: string;
}> {}
export class ExtractJobCompanyNameError extends Data.TaggedError(
  "ExtractJobCompanyName",
)<{
  readonly reason: string;
  readonly currentUrl: string;
  readonly selector: string;
}> {}
export class ExtractReceivedDateError extends Data.TaggedError(
  "ExtractReceivedDateError",
)<{
  readonly reason: string;
  readonly currentUrl: string;
  readonly selector: string;
}> {}
export class ExtractExpiryDateError extends Data.TaggedError(
  "ExtractExpiryDateError",
)<{
  readonly reason: string;
  readonly currentUrl: string;
  readonly selector: string;
}> {}
export class ExtractHomePageError extends Data.TaggedError(
  "ExtractHomePageError",
)<{
  readonly reason: string;
  readonly currentUrl: string;
  readonly selector: string;
}> {}
export class ExtractOccupationError extends Data.TaggedError(
  "ExtractOccupationError",
)<{
  readonly reason: string;
  readonly currentUrl: string;
  readonly selector: string;
}> {}
export class ExtractEmployMentTypeError extends Data.TaggedError(
  "ExtractEmployMentTypeError",
)<{
  readonly reason: string;
  readonly currentUrl: string;
  readonly selector: string;
}> {}
export class ExtractWageError extends Data.TaggedError("ExtractWageError")<{
  readonly reason: string;
  readonly currentUrl: string;
  readonly selector: string;
}> {}
export class ExtractWorkingHoursError extends Data.TaggedError(
  "ExtractWorkingHoursError",
)<{
  readonly reason: string;
  readonly currentUrl: string;
  readonly selector: string;
}> {}
export class ExtractEmployeeCountError extends Data.TaggedError(
  "ExtractEmployeeCountError",
)<{
  readonly reason: string;
  readonly currentUrl: string;
  readonly selector: string;
}> {}
export class ExtractWorkPlaceError extends Data.TaggedError(
  "ExtractWorkPlaceError",
)<{
  readonly reason: string;
  readonly currentUrl: string;
  readonly selector: string;
}> {}
export class ExtractJobDescriptionError extends Data.TaggedError(
  "ExtractJobDescriptionError",
)<{
  readonly reason: string;
  readonly currentUrl: string;
  readonly selector: string;
}> {}
export class ExtractQualificationsError extends Data.TaggedError(
  "ExtractQualificationsError",
)<{
  readonly reason: string;
  readonly currentUrl: string;
  readonly selector: string;
}> {}

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
