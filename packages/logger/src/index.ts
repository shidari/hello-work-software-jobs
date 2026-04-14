import { Cause, Effect, Logger, Schema } from "effect";

// docs/LOGGING.md のキー名規約に従う Effect Logger。
// 使い方:
//   const { LoggerLayer, runLog } = makeLogger("api");
//   yield* Effect.logInfo("...").pipe(Effect.annotateLogs({ jobNumber }));
//   Effect.tapErrorCause((cause) => logErrorCause("...", cause))
//
// 各サービスは thin wrapper を `src/log.ts` 等に置いて
// `service` を束縛した LoggerLayer / runLog を再エクスポートする。

type Service = string;

const makeJsonLogger = (service: Service) =>
  Logger.make(({ logLevel, message, date, annotations }) => {
    const fields: Record<string, unknown> = {};
    for (const [key, value] of annotations) {
      fields[key] = value;
    }

    const messages = Array.isArray(message) ? message : [message];
    const msg = messages
      .map((m) => (typeof m === "string" ? m : JSON.stringify(m)))
      .join(" ");

    const record: Record<string, unknown> = {
      level: logLevel.label.toLowerCase(),
      service,
      timestamp: date.toISOString(),
      msg,
      ...fields,
    };

    if (logLevel.label === "ERROR" || logLevel.label === "WARN") {
      console.error(JSON.stringify(record));
    } else {
      console.log(JSON.stringify(record));
    }
  });

export const makeLogger = (service: Service) => {
  const LoggerLayer = Logger.replace(
    Logger.defaultLogger,
    makeJsonLogger(service),
  );

  // Effect 外 (Hono ミドルウェア、RSC ページ等) から呼ぶための橋渡し。
  const runLog = (effect: Effect.Effect<void, never, never>) =>
    Effect.runPromise(effect.pipe(Effect.provide(LoggerLayer)));

  return { LoggerLayer, runLog };
};

// Cause から _tag / error.message を抽出してエラーログを出す。
// Effect.tapErrorCause と組み合わせて使う。service 非依存。
const TaggedErrorShape = Schema.Struct({
  _tag: Schema.String,
  message: Schema.String,
});

export const logErrorCause = (msg: string, cause: Cause.Cause<unknown>) => {
  const failure = Cause.failureOption(cause);
  if (failure._tag === "Some") {
    const decoded = Schema.decodeUnknownEither(TaggedErrorShape)(failure.value);
    if (decoded._tag === "Right") {
      return Effect.logError(msg).pipe(
        Effect.annotateLogs({
          _tag: decoded.right._tag,
          error: { message: decoded.right.message },
        }),
      );
    }
  }
  return Effect.logError(msg).pipe(
    Effect.annotateLogs({ error: { message: Cause.pretty(cause) } }),
  );
};
