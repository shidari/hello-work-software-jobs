import { defineConfig } from "tsdown";
export default defineConfig({
  entry: "src/index.ts",
  noExternal: ["zod", "valibot"],
  outDir: "dist",
  dts: true,
  sourcemap: true,
  clean: true,
  format: ["cjs", "esm"],
});
