import type { InferOutput } from "valibot";
import type { jobSelectSchema, jobs } from "../../schemas";

// 🔍 型チェック用ユーティリティ
export type KeysMustMatch<A, B> = Exclude<keyof A, keyof B> extends never
  ? Exclude<keyof B, keyof A> extends never
    ? true
    : ["Extra keys in B:", Exclude<keyof B, keyof A>]
  : ["Extra keys in A:", Exclude<keyof A, keyof B>];

type JobSelectFromDrizzle = typeof jobs.$inferSelect;

type JobSelectFromValibot = InferOutput<typeof jobSelectSchema>;

type Check = KeysMustMatch<JobSelectFromDrizzle, JobSelectFromValibot>;
// 一旦キーだけ比較してる
const _check: Check = true;
