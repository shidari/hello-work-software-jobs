// vitest bench の outputJson (files[].groups[].benchmarks[]) を
// benchmark-action/github-action-benchmark の customSmallerIsBetter 形式に変換する。
//
// 単位は ms/op (vitest の `mean` をそのまま採用)。範囲表示は ±moe を ms で出す。
// 出力先は .bench/result.json。

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

type VitestBench = {
  readonly id: string;
  readonly name: string;
  readonly mean: number;
  readonly moe: number;
};

type VitestGroup = {
  readonly fullName: string;
  readonly benchmarks: readonly VitestBench[];
};

type VitestFile = {
  readonly filepath: string;
  readonly groups: readonly VitestGroup[];
};

type VitestReport = {
  readonly files: readonly VitestFile[];
};

type ActionEntry = {
  readonly name: string;
  readonly unit: string;
  readonly value: number;
  readonly range: string;
};

const INPUT = resolve(".bench/raw.json");
const OUTPUT = resolve(".bench/result.json");

const report = JSON.parse(readFileSync(INPUT, "utf8")) as VitestReport;

const entries: ActionEntry[] = [];
for (const file of report.files) {
  const fileLabel = basename(file.filepath);
  for (const group of file.groups) {
    for (const bench of group.benchmarks) {
      entries.push({
        name: `${fileLabel} > ${bench.name}`,
        unit: "ms/op",
        value: Number(bench.mean.toFixed(6)),
        range: `± ${bench.moe.toFixed(4)}`,
      });
    }
  }
}

if (entries.length === 0) {
  console.error("no benchmarks found in", INPUT);
  process.exit(1);
}

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
console.log(`wrote ${entries.length} benchmark entries to ${OUTPUT}`);
