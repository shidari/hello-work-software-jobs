#!/usr/bin/env -S deno run --allow-run=container --allow-read --allow-write --allow-env
// Stop and remove the sho-sandbox container (idempotent).
// scripts/sandbox-stop.sh の TS リライト。

import * as cmd from "./lib/cmd.ts";
import * as container from "./lib/container.ts";

const NAME = "sho-sandbox";

if (!await cmd.ok("container", ["--help"])) {
  console.error("ERROR: Apple container CLI not found (https://github.com/apple/container)");
  Deno.exit(1);
}

await container.stop(NAME);
await container.deleteContainer(NAME);
