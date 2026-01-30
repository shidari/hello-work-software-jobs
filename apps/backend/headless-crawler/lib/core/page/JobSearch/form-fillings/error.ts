import { Data } from "effect";

export class FillWorkTypeError extends Data.TaggedError("FillWorkTypeError")<{
  readonly message: string;
}> {}
export class FillPrefectureFieldError extends Data.TaggedError(
  "FillPrefectureFieldError",
)<{ readonly message: string }> {}

export class FillOccupationFieldError extends Data.TaggedError(
  "FillOccupationFieldError",
)<{ readonly message: string }> {}

export class EmploymentLabelToSelectorError extends Data.TaggedError(
  "EmploymentLabelToSelectorError",
)<{
  readonly message: string;
}> {}
export class EngineeringLabelSelectorError extends Data.TaggedError(
  "EngineeringLabelSelectorError",
)<{ readonly message: string }> {}

export class FillJobNumberError extends Data.TaggedError("FillJobNumberError")<{
  readonly message: string;
}> {}

export class FillJobPeriodError extends Data.TaggedError("FillJobPeriodError")<{
  readonly message: string;
}> {}
export type JobSearchCriteriaFillFormError =
  | FillWorkTypeError
  | FillPrefectureFieldError
  | FillOccupationFieldError
  | FillJobPeriodError;

export type JobFieldFillingError =
  | FillWorkTypeError
  | FillPrefectureFieldError
  | FillOccupationFieldError;

export type JobSearchWithJobNumberFillingError = FillJobNumberError;
