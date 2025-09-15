import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  splitting: false,
  sourcemap: true,
  clean: true,
  format: ["esm"],
  noExternal: ["@sho/models"],
  target: "es2022",
});
