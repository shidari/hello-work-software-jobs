/**
 * ワークフロー型定義 - 関数型ドメイン駆動設計に基づくETLパイプライン
 *
 * このモジュールはワークフローの抽象化を提供し、再利用可能なETLステージを定義します。
 */

import { Effect } from "effect";

/**
 * ワークフローステージ
 *
 * 入力を受け取り、出力を生成する純粋なEffect関数
 *
 * @template Input - ステージへの入力型
 * @template Output - ステージからの出力型
 * @template Error - 発生する可能性のあるエラー型
 * @template Dependencies - 必要な依存関係（Effectのコンテキスト）
 */
export type Stage<Input, Output, Error, Dependencies = never> = (
  input: Input,
) => Effect.Effect<Output, Error, Dependencies>;

/**
 * ワークフロー定義
 *
 * 複数のステージを組み合わせた完全なETLパイプライン
 *
 * @template Input - ワークフロー全体への入力型
 * @template Output - ワークフロー全体からの出力型
 * @template Error - 発生する可能性のあるエラー型の和集合
 * @template Dependencies - 必要な依存関係の和集合
 */
export interface Workflow<Input, Output, Error, Dependencies = never> {
  /**
   * ワークフローを実行する
   */
  readonly run: Stage<Input, Output, Error, Dependencies>;

  /**
   * ワークフローの説明
   */
  readonly description: string;
}

/**
 * 2つのステージを合成して新しいステージを作成する
 *
 * @param stage1 - 最初のステージ
 * @param stage2 - 2番目のステージ
 * @returns 合成されたステージ
 */
export const composeStages =
  <I, M, O, E1, E2, D1, D2>(
    stage1: Stage<I, M, E1, D1>,
    stage2: Stage<M, O, E2, D2>,
  ): Stage<I, O, E1 | E2, D1 | D2> =>
  (input: I) =>
    Effect.gen(function* () {
      const intermediate = yield* stage1(input);
      const output = yield* stage2(intermediate);
      return output;
    });

/**
 * 複数のステージを順次合成する
 *
 * @param stages - 合成するステージの配列
 * @returns 合成されたステージ
 */
export const pipeStages =
  <T>(
    ...stages: Stage<T, T, unknown, unknown>[]
  ): Stage<T, T, unknown, unknown> =>
  (input: T) =>
    stages.reduce(
      (effect, stage) => Effect.flatMap(effect, (result) => stage(result)),
      Effect.succeed(input) as Effect.Effect<T, unknown, unknown>,
    );

/**
 * ワークフローを作成する
 *
 * @param description - ワークフローの説明
 * @param run - ワークフローの実行関数
 * @returns ワークフロー
 */
export const createWorkflow = <Input, Output, Error, Dependencies = never>(
  description: string,
  run: Stage<Input, Output, Error, Dependencies>,
): Workflow<Input, Output, Error, Dependencies> => ({
  description,
  run,
});
