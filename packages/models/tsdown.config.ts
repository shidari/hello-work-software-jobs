import { defineConfig } from "tsdown";
export default defineConfig({
  entry: ["src/index.ts"],
  noExternal: ["zod"],
  outDir: "dist",
  splitting: false,
  dts: true,
  sourcemap: true,
  clean: true,
  format: ["cjs", "esm"],
  target: "es2022",
});
