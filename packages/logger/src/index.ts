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

export type RedactOptions = {
  // 大小無視でマッチさせる漏らしたくないキー名。デフォルトは
  // docs/LOGGING.md「機密情報」節の列挙 (api key / authorization / cookie)。
  keys?: ReadonlyArray<string>;
  placeholder?: string;
};

const DEFAULT_REDACT_KEYS = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "apikey",
  "api_key",
  "password",
  "secret",
  "token",
] as const;

const DEFAULT_PLACEHOLDER = "[REDACTED]";

const CIRCULAR_PLACEHOLDER = "[CIRCULAR]";

const buildRedactor = (options: RedactOptions | undefined) => {
  const keys = new Set(
    (options?.keys ?? DEFAULT_REDACT_KEYS).map((k) => k.toLowerCase()),
  );
  const placeholder = options?.placeholder ?? DEFAULT_PLACEHOLDER;

  // 同じ ref を 2 箇所から annotate された場合、素の object を返すと
  // 2 個目で redact が掛からず secret が漏れる。memo で redact 済み output を再利用する。
  // また cycle の場合は memo にまだ output が入っていないので "[CIRCULAR]" を返す。
  const walk = (value: unknown, memo: Map<object, unknown>): unknown => {
    if (value === null || typeof value !== "object") return value;
    if (memo.has(value)) {
      const cached = memo.get(value);
      return cached === undefined ? CIRCULAR_PLACEHOLDER : cached;
    }
    memo.set(value, undefined);

    // Date / URL / Effect の Schema 等が持つ toJSON は JSON.stringify と同じ
    // セマンティクスで先に変換する。Object.entries だけ見ると Date は {} になって
    // 元ログから情報が落ちる。toJSON の結果側も redact 対象として再 walk する。
    const maybeToJson = (value as { toJSON?: unknown }).toJSON;
    if (typeof maybeToJson === "function") {
      const converted = (maybeToJson as () => unknown).call(value);
      const out = walk(converted, memo);
      memo.set(value, out);
      return out;
    }

    let out: unknown;
    if (Array.isArray(value)) {
      out = value.map((v) => walk(v, memo));
    } else {
      const o: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        o[k] = keys.has(k.toLowerCase()) ? placeholder : walk(v, memo);
      }
      out = o;
    }
    memo.set(value, out);
    return out;
  };

  return (value: unknown) => walk(value, new Map());
};

// 明示的に redact を掛けたい呼び出し側 (e.g. headers を annotateLogs に渡す前) 用。
// makeLogger が内部で使っているのと同じ実装を expose する。
export const redact = (value: unknown, options?: RedactOptions): unknown =>
  buildRedactor(options)(value);

const makeJsonLogger = (
  service: Service,
  redactor: (value: unknown) => unknown,
) =>
  Logger.make(({ logLevel, message, date, annotations }) => {
    const fields: Record<string, unknown> = {};
    for (const [key, value] of annotations) {
      fields[key] = value;
    }

    const messages = Array.isArray(message) ? message : [message];
    // 構造化 message (例: Effect.logInfo({ token })) は先に redact してから
    // stringify する。順番を逆にすると stringify 済みの msg 文字列が redactor に
    // 渡って key match できず、secret が msg に埋まったまま出てしまう。
    const msg = messages
      .map((m) => (typeof m === "string" ? m : JSON.stringify(redactor(m))))
      .join(" ");

    const record = redactor({
      level: logLevel.label.toLowerCase(),
      service,
      timestamp: date.toISOString(),
      msg,
      ...fields,
    });

    if (logLevel.label === "ERROR" || logLevel.label === "WARN") {
      console.error(JSON.stringify(record));
    } else {
      console.log(JSON.stringify(record));
    }
  });

export type MakeLoggerOptions = {
  redact?: RedactOptions | false;
};

export const makeLogger = (
  service: Service,
  options?: MakeLoggerOptions,
) => {
  const redactor =
    options?.redact === false
      ? (value: unknown) => value
      : buildRedactor(options?.redact);

  const LoggerLayer = Logger.replace(
    Logger.defaultLogger,
    makeJsonLogger(service, redactor),
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
