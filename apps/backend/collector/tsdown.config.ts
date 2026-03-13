import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    "job-number-handler": "aws/functions/job-number-handler/handler.ts",
    "job-detail-handler": "aws/functions/job-detail-handler/handler.ts",
  },
  outDir: "dist",
  format: ["esm"],
  platform: "node",
  target: "node22",
  sourcemap: true,
  clean: true,
});
