import { Data } from "effect";

export class QualificationsElmNotFoundError extends Data.TaggedError(
  "QualificationsElmNotFoundError",
)<{ readonly reason: string; currentUrl: string; selector: string }> {}

export class HomePageElmNotFoundError extends Data.TaggedError(
  "HomePageElmNotFoundError",
)<{ readonly reason: string; currentUrl: string; selector: string }> {}
