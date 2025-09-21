import { Data } from "effect";

export class JobSearchPageValidationError extends Data.TaggedError(
  "JobSearchPageValidationError",
)<{ readonly message: string }> {}
