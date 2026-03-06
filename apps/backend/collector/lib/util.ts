import { Effect, ParseResult } from "effect";

export function delay(ms: number) {
  return Effect.promise<void>(
    () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, ms);
      }),
  );
}

export const formatParseError = (error: ParseResult.ParseError): string =>
  ParseResult.TreeFormatter.formatErrorSync(error);
