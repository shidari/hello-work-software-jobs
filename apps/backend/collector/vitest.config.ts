import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/__tests__/**/*.test.ts", "app/**/__tests__/**/*.test.ts"],
    coverage: {
      include: ["lib/**", "app/**"],
    },
    benchmark: {
      include: ["lib/**/__bench__/**/*.bench.ts"],
      outputJson: ".bench/raw.json",
    },
  },
});
