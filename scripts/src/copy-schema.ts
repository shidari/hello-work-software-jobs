import { execSync } from "node:child_process";
import path from "node:path";
import fs from "fs-extra";
import {
  type Result,
  ResultAsync,
  err,
  errAsync,
  ok,
  okAsync,
} from "neverthrow";

const t = Symbol();
type TargetTsFilePath = string & { [t]: unknown };
export function targetPathArgsExists(relatizeTargetPath: string) {
  if (!relatizeTargetPath) {
    err({
      type: "NotFounrTargetDirArg",
      message: "Usage: ./copy-schema.mjs <target-directory>",
    });
  }
  return ok(path.resolve(process.cwd(), relatizeTargetPath));
}

export function checkTargetPath(targetPath: string) {
  if (targetPath.endsWith(".ts")) {
    return ok(targetPath as TargetTsFilePath);
  }
  return err(
    new Error(`❌ targetPath must end with ".ts": received "${targetPath}"`),
  );
}

const r = Symbol();
type RepoRootDirPath = string & { [r]: unknown };
function findGitRootByGit(): Result<RepoRootDirPath, Error> {
  try {
    const root = execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
    }).trim();
    return ok(root as RepoRootDirPath);
  } catch (e) {
    return err(new Error("Git root not found"));
  }
}

const d = Symbol();
type DrizzleSchemaPath = string & { [d]: unknown };
function getDrizzleSchemaPath() {
  return findGitRootByGit().asyncAndThen((repoRootDirPath) => {
    const drizzleSchemaPath = path.resolve(
      repoRootDirPath,
      "./packages/models/src/job-store-api/drizzle.ts",
    );
    return ResultAsync.fromSafePromise(
      fs.pathExists(drizzleSchemaPath),
    ).andThen((b) => {
      if (!b)
        errAsync(
          new Error(`drizzleSchemapath not found. path:${drizzleSchemaPath}`),
        );
      return okAsync(drizzleSchemaPath as DrizzleSchemaPath);
    });
  });
}

export function copyDrizzleSchema(targetPath: TargetTsFilePath) {
  return getDrizzleSchemaPath().andThen((drizzleSchemaPath) => {
    return ResultAsync.fromPromise(
      fs.copy(drizzleSchemaPath, targetPath),
      (e) => new Error(`❌ Failed to copy schema: ${String(e)}`),
    );
  });
}
