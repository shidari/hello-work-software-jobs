import { logErrorCause, makeLogger } from "@sho/logger";

// @sho/logger の薄いラッパ。service=frontend を束縛する。
// RSC で console.log の出力が Vercel Logs に取り込まれる。
export const { LoggerLayer, runLog } = makeLogger("frontend");
export { logErrorCause };
