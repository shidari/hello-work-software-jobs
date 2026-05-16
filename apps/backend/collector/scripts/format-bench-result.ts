// vitest bench の outputJson (files[].groups[].benchmarks[]) を読み、
// PR コメント / Actions summary 向けの markdown テーブルに整形する。
// 比較対象 (baseline) は持たず、その PR の絶対値だけを表示する。

import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";

type VitestBench = {
  readonly id: string;
  readonly name: string;
  readonly hz: number;
  readonly mean: number;
  readonly moe: number;
  readonly sampleCount: number;
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

const INPUT = resolve(".bench/raw.json");
const OUTPUT = resolve(".bench/comment.md");

const report = JSON.parse(readFileSync(INPUT, "utf8")) as VitestReport;

const lines: string[] = [];
lines.push("## Collector ETL benchmarks");
lines.push("");
lines.push("| benchmark | ops/sec | mean (ms) | ±moe (ms) | samples |");
lines.push("|---|---:|---:|---:|---:|");

let count = 0;
for (const file of report.files) {
  const fileLabel = basename(file.filepath);
  for (const group of file.groups) {
    for (const bench of group.benchmarks) {
      count += 1;
      lines.push(
        `| \`${fileLabel}\` › ${bench.name} | ${bench.hz.toLocaleString(undefined, { maximumFractionDigits: 0 })} | ${bench.mean.toFixed(4)} | ±${bench.moe.toFixed(4)} | ${bench.sampleCount} |`,
      );
    }
  }
}

if (count === 0) {
  console.error("no benchmarks found in", INPUT);
  process.exit(1);
}

lines.push("");
lines.push(
  `_${count} benchmark(s) · ホスト runner のノイズが乗るため絶対値ではなく傾向を見る用途_`,
);
const md = `${lines.join("\n")}\n`;

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, md, "utf8");

// GH Actions の Step Summary にも反映 (Actions タブ側でも閲覧可能にする)
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  appendFileSync(summaryPath, md, "utf8");
}

console.log(`wrote ${count} benchmark rows to ${OUTPUT}`);
