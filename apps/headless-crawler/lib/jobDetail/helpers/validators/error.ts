import { Data } from "effect";

export class JobDetailPageValidationError extends Data.TaggedError(
  "JobDetailPageValidationError",
)<{ readonly reason: string; readonly currentUrl: string }> { }

export class JobNumberValidationError extends Data.TaggedError(
  "JobNumberValidationError",
)<{
  readonly detail: string;
  readonly serializedVal: string;
}> { }
export class CompanyNameValidationError extends Data.TaggedError(
  "CompanyNameValidationError",
)<{
  readonly detail: string;
  readonly serializedVal: string;
}> { }
export class ReceivedDateValidationError extends Data.TaggedError(
  "ReceivedDateValidationError",
)<{
  readonly detail: string;
  readonly serializedVal: string;
}> { }
export class ExpiryDateValidationError extends Data.TaggedError(
  "ExpiryDateValidationError",
)<{
  readonly detail: string;
  readonly serializedVal: string;
}> { }
export class RawHomePageValidationError extends Data.TaggedError(
  "RawHomePageValidationError",
)<{
  readonly detail: string;
  readonly serializedVal: string;

}> { }
export class HomePageValidationError extends Data.TaggedError(
  "HomePageValidationError",
)<{
  readonly detail: string;
  readonly serializedVal: string;
}> { }
export class OccupationValidationError extends Data.TaggedError(
  "OccupationValidationError",
)<{
  readonly detail: string;
  readonly serializedVal: string;
}> { }
export class EmploymentTypeValidationError extends Data.TaggedError(
  "EmploymentTypeValidationError",
)<{
  readonly detail: string;
  readonly serializedVal: string;
}> { }
export class WageValidationError extends Data.TaggedError(
  "WageValidationError",
)<{
  readonly detail: string;
  readonly serializedVal: string;
}> { }
export class WorkingHoursValidationError extends Data.TaggedError(
  "WageValidationError",
)<{
  readonly detail: string;
  readonly serializedVal: string;
}> { }
export class EmployeeCountValidationError extends Data.TaggedError(
  "EmployeeCountValidationError",
)<{
  readonly detail: string;
  readonly serializedVal: string;
}> { }
export class WorkPlaceValidationError extends Data.TaggedError(
  "WorkPlaceValidationError",
)<{
  readonly detail: string;
  readonly serializedVal: string;
}> { }
export class JobDescriptionValidationError extends Data.TaggedError(
  "JobDescriptionValidationError",
)<{
  readonly detail: string;
  readonly serializedVal: string;
}> { }
export class QualificationValidationError extends Data.TaggedError(
  "QualificationValidationError",
)<{
  readonly detail: string;
  readonly serializedVal: string;
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
