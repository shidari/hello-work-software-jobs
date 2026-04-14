import { logErrorCause, makeLogger } from "@sho/logger";

// @sho/logger の薄いラッパ。service=api を束縛する。
export const { LoggerLayer, runLog } = makeLogger("api");
export { logErrorCause };
