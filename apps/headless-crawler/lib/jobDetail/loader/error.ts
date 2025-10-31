import { Data } from "effect";

export class InsertJobError extends Data.TaggedError("InsertJobError")<{
  readonly reason: string;
  readonly serializedPayload: string;
  readonly responseStatus?: number; // セマンティクス的におかしい気がするけど、現状他に思いつかないので、一旦これで
  readonly responseStatusMessage?: string; // セマンティクス的におかしい気がするけど、現状他に思いつかないので、一旦これで
}> {}
