import { Data } from "effect";

export class JobListPageValidationError extends Data.TaggedError(
  "JobListPageValidationError",
)<{ readonly message: string }> {}
