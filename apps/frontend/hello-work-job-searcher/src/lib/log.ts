import { makeLogger } from "@sho/logger";

// @sho/logger の薄いラッパ。service=frontend を束縛する。
// RSC で console.log の出力が Vercel Logs に取り込まれる。
export const { runLog } = makeLogger("frontend");
