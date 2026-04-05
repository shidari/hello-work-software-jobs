/**
 * システムエラー: インフラ・外部サービス起因の予期しないエラー。
 * ブラウザ起動失敗、ネットワークエラー、SQS 送信失敗など。
 */
export type SystemError = {
  readonly reason: string;
  readonly error: Error;
};

/**
 * ドメインエラー: ビジネスロジック・バリデーション起因のエラー。
 * 求人番号の形式不正���ページ構造の不一致、期待するデータの欠落など。
 */
export type DomainError = {
  readonly reason: string;
};
