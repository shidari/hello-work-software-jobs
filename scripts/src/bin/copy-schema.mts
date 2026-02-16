import { argv } from "node:process";
import { checkTargetPath, copyDrizzleSchema } from "../copy-schema.js";
console.log("cwd:", process.cwd());
const targetPath = argv[2];
if (!targetPath) {
  console.error("❌ Usage: command <target-path.ts>");
  process.exit(1);
}

const result = await checkTargetPath(targetPath).asyncAndThen((targetPath) =>
  copyDrizzleSchema(targetPath),
);

result.match(
  () => console.log("schema copy succeeded!"),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
