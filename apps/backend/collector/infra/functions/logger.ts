import { logErrorCause, makeLogger } from "@sho/logger";

// @sho/logger の薄いラッパ。service=collector を束縛する。
export const { LoggerLayer, runLog } = makeLogger("collector");
export { logErrorCause };
