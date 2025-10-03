import { Data } from "effect";

export class ListJobsError extends Data.TaggedError("ListJobsError")<{
  readonly message: string;
}> {}

export class IsNextPageEnabledError extends Data.TaggedError(
  "IsNextPageEnabledError",
)<{ readonly message: string }> {}

export class JobNumberValidationError extends Data.TaggedError(
  "JobNumberValidationError",
)<{
  readonly message: string;
}> {}
