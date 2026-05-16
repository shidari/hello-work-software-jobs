import { Schema } from "effect";
import { parseHTML } from "linkedom";
import { bench, describe } from "vitest";
import {
  extractRawCompanyFromDocument,
  extractRawFieldsFromDocument,
} from "../extractor";
import { RawJobToDomainJob } from "../transformer";

// Hellowork 求人詳細 HTML の代表的フィールド構成を再現した固定 fixture。
// 実際の DOM ID 集合は extractor.ts と一致させてあるので、抽出パスが
// 全フィールドを舐めるシナリオになる。
const FIXTURE_FIELDS: Record<string, string> = {
  ID_kjNo: "13010-12345678",
  ID_jgshMei: "株式会社サンプル",
  ID_uktkYmd: "2026年4月1日",
  ID_shkiKigenHi: "2026年6月30日",
  ID_hp: "example.co.jp",
  ID_sksu: "ソフトウェア開発技術者",
  ID_koyoKeitai: "正社員",
  ID_chgn: "300,000円〜500,000円",
  ID_shgJn1: "9時00分〜18時00分",
  ID_jgisKigyoZentai: "150人",
  ID_shgBsJusho: "東京都渋谷区神宮前1-2-3",
  ID_shigotoNy:
    "Web アプリケーションの設計・開発・運用を担当いただきます。フロントエンド・バックエンドどちらも触れる環境です。",
  ID_hynaMenkyoSkku: "普通自動車運転免許",
  ID_jgshNo: "0101-626495-7",
  ID_kjKbn: "フルタイム",
  ID_sngBrui: "情報通信業",
  ID_juriAtsh: "ハローワーク渋谷",
  ID_onlinJishuOboUktkKahi: "可",
  ID_hakenUkeoiToShgKeitai: "派遣・請負ではない",
  ID_koyoKikan: "雇用期間の定めなし",
  ID_nenreiSegn: "不問",
  ID_grki: "高校卒以上",
  ID_hynaKiknt: "実務経験 3 年以上",
  ID_trialKikan: "あり (3 ヶ月)",
  ID_mycarTskn: "可",
  ID_tenkinNoKnsi: "なし",
  ID_chgnKeitaiToKbn: "月給",
  ID_shokyuSd: "あり (年 1 回)",
  ID_shoyoSdNoUmu: "あり (年 2 回)",
  ID_knyHoken: "雇用・労災・健康・厚生",
  ID_tskinSd: "あり (勤続 3 年以上)",
  ID_szciYbn: "150-0001",
  ID_szci: "東京都渋谷区神宮前1-2-3 サンプルビル 5F",
  ID_setsuritsuNen: "2001",
  ID_shkn: "1,000万円",
  ID_jigyoNy: "Web アプリケーションの受託開発および自社サービス運営",
  ID_hoNinNo: "9430001008073",
};

function buildJobDetailHtml(fields: Record<string, string>): string {
  const cells = Object.entries(fields)
    .map(([id, value]) => `<td id="${id}">${value}</td>`)
    .join("");
  return `<!doctype html><html><body><table>${cells}</table></body></html>`;
}

const FIXTURE_HTML = buildJobDetailHtml(FIXTURE_FIELDS);
const FIXTURE_RAW_JOB = (() => {
  const { document } = parseHTML(FIXTURE_HTML);
  return extractRawFieldsFromDocument(document as unknown as Document);
})();
const decodeRawJob = Schema.decodeUnknownEither(RawJobToDomainJob);

describe("collector ETL hot path", () => {
  bench("linkedom: parseHTML", () => {
    parseHTML(FIXTURE_HTML);
  });

  bench("extractor: parseHTML + extract raw fields", () => {
    const { document } = parseHTML(FIXTURE_HTML);
    extractRawFieldsFromDocument(document as unknown as Document);
    extractRawCompanyFromDocument(document as unknown as Document);
  });

  bench("transformer: RawJob → domain (Schema.decodeUnknownEither)", () => {
    decodeRawJob(FIXTURE_RAW_JOB);
  });

  bench("end-to-end: HTML → domain", () => {
    const { document } = parseHTML(FIXTURE_HTML);
    const raw = extractRawFieldsFromDocument(document as unknown as Document);
    extractRawCompanyFromDocument(document as unknown as Document);
    decodeRawJob(raw);
  });
});
