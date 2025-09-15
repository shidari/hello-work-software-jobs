export type JWTDecodeError = {
  readonly _tag: "JWTDecodeError";
  readonly message: string;
};

export type JWTExpiredError = {
  readonly _tag: "JWTExpiredError";
  readonly message: string;
};

export type DecodeJWTPayloadError = {
  readonly _tag: "DecodeJWTPayloadError";
  readonly message: string;
};

// エラー型定義
// エラーファクトリ関数
export const createJWTDecodeError = (message: string): JWTDecodeError => ({
  _tag: "JWTDecodeError",
  message,
});

export const createJWTExpiredError = (message: string): JWTExpiredError => ({
  _tag: "JWTExpiredError",
  message,
});

export const createDecodeJWTPayloadError = (
  message: string,
): DecodeJWTPayloadError => ({
  _tag: "DecodeJWTPayloadError",
  message,
});
