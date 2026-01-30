import { Data } from "effect";

export class GoToJobListError extends Data.TaggedError("GoToJobListError")<{
  readonly message: string;
}> {}

export class JobListPagenationError extends Data.TaggedError(
  "JobListPagenationError",
)<{ readonly message: string }> {}

export class GoToJobSearchPageError extends Data.TaggedError(
  "GoToJobSearchPageError",
)<{ readonly message: string }> {}

export class SearchThenGotoFirstJobListPageError extends Data.TaggedError(
  "SearchThenGotoFirstJobListPageError",
)<{ readonly message: string }> {}
export class SearchThenGotoJobListPageError extends Data.TaggedError(
  "SearchThenGotoJobListPageError",
)<{ readonly message: string }> {}

export class JobDetailPagePagenationError extends Data.TaggedError(
  "JobDetailPagePagenationError",
)<{ readonly message: string }> {}
