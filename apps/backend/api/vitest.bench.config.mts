import { defineConfig } from "vitest/config";

// bench は pool-workers を使わず素の Node 上で走らせる。
// Schema.transform は純粋関数なので D1 binding は不要で、bench も Node の方が
// workerd の overhead が無く安定する。`vitest.config.mts` (pool-workers) と
// 完全に独立した config として運用する。
export default defineConfig({
  test: {
    benchmark: {
      include: ["src/**/__bench__/**/*.bench.ts"],
      outputJson: ".bench/raw.json",
    },
  },
});
