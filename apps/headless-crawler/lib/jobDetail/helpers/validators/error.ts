import { Data } from "effect";

export class JobDetailPageValidationError extends Data.TaggedError(
  "JobDetailPageValidationError",
)<{ readonly message: string }> { }

export class JobNumberValidationError extends Data.TaggedError(
  "JobNumberValidationError",
)<{
  readonly message: string;
}> { }
export class CompanyNameValidationError extends Data.TaggedError(
  "CompanyNameValidationError",
)<{
  readonly message: string;
}> { }
export class ReceivedDateValidationError extends Data.TaggedError(
  "ReceivedDateValidationError",
)<{
  readonly message: string;
}> { }
export class ExpiryDateValidationError extends Data.TaggedError(
  "ExpiryDateValidationError",
)<{
  readonly message: string;
}> { }
export class RawHomePageValidationError extends Data.TaggedError(
  "RawHomePageValidationError",
)<{
  readonly message: string;
}> { }
export class HomePageValidationError extends Data.TaggedError(
  "HomePageValidationError",
)<{
  readonly message: string;
}> { }
export class OccupationValidationError extends Data.TaggedError(
  "OccupationValidationError",
)<{
  readonly message: string;
}> { }
export class EmploymentTypeValidationError extends Data.TaggedError(
  "EmploymentTypeValidationError",
)<{
  readonly message: string;
}> { }
export class WageValidationError extends Data.TaggedError(
  "WageValidationError",
)<{
  readonly message: string;
}> { }
export class WorkingHoursValidationError extends Data.TaggedError(
  "WageValidationError",
)<{
  readonly message: string;
}> { }
export class EmployeeCountValidationError extends Data.TaggedError(
  "EmployeeCountValidationError",
)<{
  readonly message: string;
}> { }
export class WorkPlaceValidationError extends Data.TaggedError(
  "WorkPlaceValidationError",
)<{
  readonly message: string;
}> { }
export class JobDescriptionValidationError extends Data.TaggedError(
  "JobDescriptionValidationError",
)<{
  readonly message: string;
}> { }
export class QualificationValidationError extends Data.TaggedError(
  "QualificationValidationError",
)<{
  readonly message: string;
}> { }

export type JobDetailPropertyValidationError =
  | JobNumberValidationError
  | CompanyNameValidationError
  | ReceivedDateValidationError
  | ExpiryDateValidationError
  | HomePageValidationError
  | OccupationValidationError
  | EmploymentTypeValidationError
  | WageValidationError
  | WorkingHoursValidationError
  | EmployeeCountValidationError
  | WorkPlaceValidationError
  | JobDescriptionValidationError
  | QualificationValidationError;
