import type { jobListSuccessResponseSchema, SearchFilter } from "@sho/models";
import type { ResultAsync } from "neverthrow";
import type { InferOutput } from "valibot";
/**
 * 求人ストアクライアントの共通インターフェース
 */
export interface JobStoreClient {
  /**
   * 初期求人リスト取得
   * @param filter 検索フィルター
   */
  getInitialJobs(
    filter?: SearchFilter,
  ): ResultAsync<InferOutput<typeof jobListSuccessResponseSchema>, Error>;

  /**
   * 続きの求人リスト取得
   * @param nextToken ページネーション用トークン
   */
  getContinuedJobs(
    nextToken: string,
  ): ResultAsync<InferOutput<typeof jobListSuccessResponseSchema>, Error>;
}
