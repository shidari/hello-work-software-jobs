import { Data } from "effect";

export class InsertJobError extends Data.TaggedError("InsertJobError")<{
  readonly message: string;
}> { }