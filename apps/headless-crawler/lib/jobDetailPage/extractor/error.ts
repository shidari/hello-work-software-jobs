import { Data } from "effect";

export class ImportChromiumError extends Data.TaggedError(
  "ImportChromiumError",
)<{
  readonly message: string;
}> {}

export class GetExecutablePathError extends Data.TaggedError(
  "GetExecutablePathError",
)<{
  readonly message: string;
}> {}

export class ExtractJobDetailRawHtmlError extends Data.TaggedError(
  "ExtractJobDetailRawHtmlError",
)<{
  readonly message: string;
}> {}
