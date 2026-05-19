import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [storybookTest()],
  test: {
    name: "storybook",
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
    setupFiles: [".storybook/vitest.setup.ts"],
    // browser mode は workerd 同様 node:inspector が無く v8 coverage が取れない。
    // istanbul は変換時に instrument するため browser でも動作する。
    coverage: {
      provider: "istanbul",
      include: ["src/**"],
      exclude: ["src/**/*.stories.{ts,tsx}", "src/**/*.mock.ts"],
    },
  },
});
