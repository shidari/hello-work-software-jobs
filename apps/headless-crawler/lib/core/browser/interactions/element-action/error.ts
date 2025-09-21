import { Data } from "effect";

export class HomePageElmNotFoundError extends Data.TaggedError(
  "HomePageElmNotFoundError",
)<{ readonly message: string }> {}
export class QualificationsElmNotFoundError extends Data.TaggedError(
  "QualificationsElmNotFoundError",
)<{ readonly message: string }> {}

export class ListJobsError extends Data.TaggedError("ListJobsError")<{
  readonly message: string;
}> {}

export class IsNextPageEnabledError extends Data.TaggedError(
  "IsNextPageEnabledError",
)<{ readonly message: string }> {}
