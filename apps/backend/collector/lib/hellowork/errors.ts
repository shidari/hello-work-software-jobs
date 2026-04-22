import { Data } from "effect";
import type { DomainError, SystemError } from "../error";

export class PageActionError extends Data.TaggedError(
  "PageActionError",
)<SystemError> {}

export class InvalidJobNumberFormatError extends Data.TaggedError(
  "InvalidJobNumberFormatError",
)<DomainError> {}
