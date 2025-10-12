import { Data } from "effect";

export class LaunchBrowserError extends Data.TaggedError("LaunchBrowserError")<{
  readonly message: string;
}> { }
export class NewPageError extends Data.TaggedError("NewPageError")<{
  readonly message: string;
}> { }
export class NewContextError extends Data.TaggedError("NewContextError")<{
  readonly message: string;
}> { }


export class ImportChromiumError extends Data.TaggedError(
  "ImportChromiumError",
)<{
  readonly message: string;
}> { }

export class GetExecutablePathError extends Data.TaggedError(
  "GetExecutablePathError",
)<{
  readonly message: string;
}> { }