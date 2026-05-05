/**
 * HelloWork CSS クラスを使った最小構成のフィクスチャ HTML を生成する。
 *
 * - chrome（header / breadcrumbs / page_title / footer）はあるが画像・JS は持たない
 * - body は crawler が触る要素だけを置き、ダミーデータをはめる
 * - スタイリングは __shared__/styles.css（実 dump から取得した CSS）が当てる
 *
 * Usage:
 *   pnpm tsx lib/hellowork/scripts/build-fixtures.ts
 */

import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = resolve(__dirname, "../__tests__/__fixtures__");
const SCENARIO_DIR = resolve(FIXTURES_ROOT, "job-list-pagination");

const LIST_BASE = "https://www.hellowork.mhlw.go.jp/kensaku/GECA130010.do";

const layout = (
  title: string,
  pageTitle: string,
  body: string,
): string => `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="stylesheet" href="../__shared__/styles.css" />
</head>
<body>
<div id="all">
  <div class="body-in">
    <header id="top_header">
      <div id="header" class="flex align_center last_right nowrap">
        <a href="#" class="flex nowrap" style="text-decoration:none">
          <span style="font-size:0.85em;color:#666;padding:0.4em 0 0 0.6em;display:inline-block">HelloWork Internet Service</span>
          <span style="font-size:1.4em;font-weight:bold;color:#0c814a;padding:0.2em 1em 0.4em 0.6em;display:inline-block;line-height:1.1">ハローワーク インターネットサービス</span>
        </a>
        <div class="flex jus_end align_center" style="gap:0.5em;padding-right:1em">
          <span style="font-size:0.8em;color:#666;border:1px solid #ccc;padding:0.2em 0.5em">アクセシビリティ</span>
          <span style="font-size:0.8em;color:#0c814a;border:1px solid #0c814a;padding:0.2em 0.5em">厚生労働省</span>
        </div>
      </div>
      <div id="breadcrumbs" class="m_side5p">
        <span><a href="#">トップ</a>&nbsp; &gt; &nbsp;求人検索 </span>
      </div>
    </header>
    <div id="container" style="padding-top: 74px;">
      <div class="page_title">${pageTitle}</div>
      <div style="background:#fff8d6;color:#7a5f00;padding:0.4em 1em;font-size:0.85em;border-bottom:1px solid #e6d28a">
        ⚠ これはテスト用フィクスチャです。実在のデータではありません。
      </div>
      ${body}
    </div>
    <footer>
      <hr />
      <div class="footer_navi">
        <p class="m_side_auto"
          style="text-align:center;padding:0.5em 0;font-size:0.85em">
          ｜ <a href="#">リンク集</a> ｜ <a href="#">サイトマップ</a> ｜ <a href="#">サイトポリシー</a> ｜ <a href="#">プライバシーポリシー</a> ｜ <a href="#">利用規約</a> ｜ <a href="#">よくあるご質問</a> ｜ <a href="#">お問い合わせ先</a> ｜
        </p>
        <p class="m_side_auto footer_copyright">All rights reserved, Copyright (C) Employment Security Bureau,Ministry of Health, Labour and Welfare</p>
      </div>
    </footer>
  </div>
</div>
</body>
</html>
`;

// ── Search page: form を post して list 1 へ ──
const searchHtml = layout(
  "かんたん検索（テスト用フィクスチャ）",
  "求人情報検索・一覧",
  `
      <div class="flex width99p mt1 pl05" style="display:flex;justify-content:space-between;align-items:center;padding:0.5em 1em">
        <div style="display:flex;align-items:center;gap:0.5em">
          <span style="color:#0c814a;font-size:1.2em">●</span>
          <a id="ID_loginLink" class="mr2" href="#" style="color:#0c814a">求職者マイページにログイン</a>
        </div>
        <button type="button" class="button link_style" id="ID_infTkRiyoDantaiBtn"
          style="background:none;border:1px solid #0c814a;color:#0c814a;padding:0.3em 0.8em">
          情報提供利用団体ＩＤを設定
        </button>
      </div>
      <div class="width100p mt2 mb05">
        <div class="width100p flex jus_center" style="display:flex;justify-content:center;align-items:center;gap:0.5em">
          <div class="color_main fs2_5 fw700">かんたん検索</div>
        </div>
        <div class="width100p flex jus_center ta_center">
          職種や条件を選択して<br>かんたんに求人を検索できます。
        </div>
      </div>
      <form id="ID_form_1" name="form_1" method="post" action="${LIST_BASE}" novalidate>
        <table class="normal mb1">
          <tbody>
            <tr>
              <th scope="row" style="background:#e8f4ec;width:14em;padding:0.8em 1em;text-align:left;vertical-align:top;border-right:1px solid #d8e8de">
                <span class="fb">職種</span>
                <span style="display:inline-block;background:#d80000;color:#fff;font-size:0.75em;padding:0.15em 0.5em;margin-left:0.5em;border-radius:2px;vertical-align:middle">必須</span>
              </th>
              <td>
                <div class="flex easyShokusyuBox mt1">
                  <button type="button" id="ID_LdaiEasyShokusyuBox11"
                    class="button buttonStyle boxShadow">IT・Web・エンジニア</button>
                </div>
                <div class="flex easyShokusyuModalBox mt1">
                  <button type="button" id="ID_LmodalTmpEasyShokusyuBox1100"
                    class="button buttonStyle">ソフトウェア開発技術者、プログラマー</button>
                </div>
                <div class="ta_right mt1">
                  <button type="button" class="button main shadowed">決定</button>
                </div>
              </td>
            </tr>
            <tr>
              <th scope="row" style="background:#e8f4ec;width:14em;padding:0.8em 1em;text-align:left;vertical-align:top;border-right:1px solid #d8e8de"><span class="fb">勤務地</span></th>
              <td>
                <div class="flex mt1" style="gap:0.5em;flex-wrap:wrap">
                  <button type="button" class="button buttonStyle">都道府県を選択</button>
                  <button type="button" class="button buttonStyle">市区町村を選択</button>
                </div>
              </td>
            </tr>
            <tr>
              <th scope="row" style="background:#e8f4ec;width:14em;padding:0.8em 1em;text-align:left;vertical-align:top;border-right:1px solid #d8e8de"><span class="fb">賃金</span></th>
              <td>
                <div class="flex mt1 align_center" style="gap:0.5em">
                  <input type="text" placeholder="下限" style="width:6em;padding:0.3em" />
                  <span>円 〜</span>
                  <input type="text" placeholder="上限" style="width:6em;padding:0.3em" />
                  <span>円</span>
                </div>
              </td>
            </tr>
            <tr>
              <th scope="row" style="background:#e8f4ec;width:14em;padding:0.8em 1em;text-align:left;vertical-align:top;border-right:1px solid #d8e8de"><span class="fb">雇用形態</span></th>
              <td>
                <div class="flex mt1" style="gap:0.5em;flex-wrap:wrap">
                  <label><input type="checkbox" /> 正社員</label>
                  <label><input type="checkbox" /> 正社員以外</label>
                  <label><input type="checkbox" /> パート労働者</label>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="ta_center mt1 mb1">
          <button class="button main shadowed"
            id="ID_searchBtn" name="searchBtn" type="submit"
            value=" 検索する"
            style="font-size:1.2em;padding:0.6em 3em">
            検索する
          </button>
        </div>
      </form>`,
);

// ── List page: 1〜N ページに対応 ──
type ListConfig = {
  readonly file: string;
  readonly pageNo: 1 | 2 | 3;
  readonly url: string;
  readonly nextUrl: string | null; // null なら 次へ disabled
};

const listConfigs: readonly ListConfig[] = [
  {
    file: "02-list-1.html",
    pageNo: 1,
    url: `${LIST_BASE}`,
    nextUrl: `${LIST_BASE}?p=2`,
  },
  {
    file: "03-list-2.html",
    pageNo: 2,
    url: `${LIST_BASE}?p=2`,
    nextUrl: `${LIST_BASE}?p=3`,
  },
  {
    file: "04-list-3.html",
    pageNo: 3,
    url: `${LIST_BASE}?p=3`,
    nextUrl: null,
  },
];

const listHtml = (cfg: ListConfig): string => {
  const baseIdx = (cfg.pageNo - 1) * 3;
  const jobs = [0, 1, 2]
    .map((i) => {
      const idx = baseIdx + i + 1;
      const jobNumber = `99999-9999999${idx}`;
      const company = `テスト株式会社${String.fromCharCode(0x40 + idx)}`;
      const wage = `${(idx % 3) * 50 + 240},000円〜${(idx % 3) * 50 + 400},000円`;
      const location = ["東京都千代田区", "大阪府大阪市", "愛知県名古屋市"][
        idx % 3
      ];
      const workHours = [
        "08時30分〜17時30分",
        "09時00分〜18時00分",
        "10時00分〜19時00分",
      ][idx % 3];
      const description = [
        "Webアプリケーションの設計・開発を担当していただきます。要件定義からリリースまで一貫して関わります。",
        "業務システムの保守・改修。クラウド環境への移行プロジェクトを推進します。",
        "新規プロダクトの開発。アジャイル開発手法で進めます。",
      ][idx % 3];
      return `
      <table class="kyujin m_v_1_pc m_v_0_5_sd" style="width:100%;border-collapse:separate;border-spacing:0;border:1px solid #c8e3d0;background:#fff;margin:1em 0">
        <tbody>
          <tr class="kyujin_head" style="background:#f0f8f3">
            <td style="padding:0.5em 1em">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5em">
                <div style="display:flex;gap:1.5em;align-items:center">
                  <span><label><input type="checkbox" /> チェック</label></span>
                  <span>受付年月日：2026年5月1日</span>
                  <span>紹介期限日：2026年7月31日</span>
                </div>
                <div style="display:flex;gap:0.5em;align-items:center">
                  <span style="background:#d80000;color:#fff;font-size:0.8em;padding:0.15em 0.6em;border-radius:2px">新着</span>
                  <span style="background:#fff;color:#333;font-size:0.85em;padding:0.15em 0.5em;border:1px solid #ccc">正社員</span>
                  <span style="background:#fff;color:#333;font-size:0.85em;padding:0.15em 0.5em;border:1px solid #ccc">フル</span>
                  <span style="font-size:0.85em;color:#666">▼ ${location}</span>
                </div>
              </div>
            </td>
          </tr>
          <tr class="kyujin_body">
            <td style="padding:0">
              <div style="display:flex;flex-wrap:wrap">
                <div style="flex:1 1 50%;min-width:20em">
                  <table style="width:100%;border-collapse:collapse">
                    <tbody>
                      <tr>
                        <td style="vertical-align:top;padding:0.5em;width:9em"><span style="display:inline-block;background:#0c814a;color:#fff;font-size:0.85em;padding:0.15em 0.5em;border-radius:2px">職種</span></td>
                        <td style="padding:0.5em;font-weight:bold">ソフトウェア開発技術者</td>
                      </tr>
                      <tr>
                        <td style="vertical-align:top;padding:0.5em"><span style="display:inline-block;background:#0c814a;color:#fff;font-size:0.85em;padding:0.15em 0.5em;border-radius:2px">仕事の内容</span></td>
                        <td style="padding:0.5em">${description}</td>
                      </tr>
                      <tr>
                        <td style="vertical-align:top;padding:0.5em"><span style="display:inline-block;background:#fff;color:#333;font-size:0.85em;padding:0.15em 0.5em;border:1px solid #ccc">事業所名</span></td>
                        <td style="padding:0.5em">${company}</td>
                      </tr>
                      <tr>
                        <td style="vertical-align:top;padding:0.5em"><span style="display:inline-block;background:#fff;color:#333;font-size:0.85em;padding:0.15em 0.5em;border:1px solid #ccc">就業場所</span></td>
                        <td style="padding:0.5em">${location}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style="flex:1 1 50%;min-width:20em;border-left:1px solid #e8f0e8">
                  <table style="width:100%;border-collapse:collapse">
                    <tbody>
                      <tr>
                        <td style="vertical-align:top;padding:0.5em;width:9em"><span style="display:inline-block;background:#fff;color:#333;font-size:0.85em;padding:0.15em 0.5em;border:1px solid #ccc">賃金<span style="font-size:0.75em">（手当等を含む）</span></span></td>
                        <td style="padding:0.5em">${wage}</td>
                      </tr>
                      <tr>
                        <td style="vertical-align:top;padding:0.5em"><span style="display:inline-block;background:#fff;color:#333;font-size:0.85em;padding:0.15em 0.5em;border:1px solid #ccc">就業時間</span></td>
                        <td style="padding:0.5em">（1）${workHours}</td>
                      </tr>
                      <tr>
                        <td style="vertical-align:top;padding:0.5em"><span style="display:inline-block;background:#fff;color:#333;font-size:0.85em;padding:0.15em 0.5em;border:1px solid #ccc">休日</span></td>
                        <td style="padding:0.5em">土日祝他<br>週休二日制：毎週<br>年間休日数：125日</td>
                      </tr>
                      <tr>
                        <td style="vertical-align:top;padding:0.5em"><span style="display:inline-block;background:#eee;color:#666;font-size:0.85em;padding:0.15em 0.5em;border:1px solid #ccc">求人番号</span></td>
                        <td style="padding:0.5em">
                          <div style="display:flex;justify-content:space-between;align-items:center">
                            <span>${jobNumber}</span>
                            <button type="button" class="qr_btn button shadowed main" data-id="${jobNumber}"
                              style="display:inline-flex;flex-direction:column;align-items:center;padding:0.4em 0.8em;font-size:0.75em;line-height:1.1">
                              <span>二次元</span>
                              <span>バーコード</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div style="padding:0.5em 1em;border-top:1px solid #e8f0e8;display:flex;gap:0.5em;flex-wrap:wrap">
                <span style="font-size:0.8em;color:#0c814a;border:1px solid #c8e3d0;padding:0.1em 0.5em;background:#fff">学歴不問</span>
                <span style="font-size:0.8em;color:#0c814a;border:1px solid #c8e3d0;padding:0.1em 0.5em;background:#fff">資格不問</span>
                <span style="font-size:0.8em;color:#0c814a;border:1px solid #c8e3d0;padding:0.1em 0.5em;background:#fff">週休二日制（土日休）</span>
                <span style="font-size:0.8em;color:#0c814a;border:1px solid #c8e3d0;padding:0.1em 0.5em;background:#fff">通勤手当あり</span>
              </div>
              <div style="padding:0.5em 1em;text-align:right;border-top:1px solid #e8f0e8">
                <button type="button" class="button buttonStyle">詳細を表示</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>`;
    })
    .join("\n");

  const nextBtn = cfg.nextUrl
    ? `<input type="button" class="button main shadowed" value="次へ＞" onclick="window.location.href='${cfg.nextUrl}'" />`
    : `<input type="button" class="button main shadowed" value="次へ＞" disabled />`;

  return layout(
    `求人検索結果 ${cfg.pageNo}/3（テスト用フィクスチャ）`,
    `求人検索結果 ${cfg.pageNo}/3`,
    `
      <div class="search_result_block">
        ${jobs}
      </div>
      <div class="paginator ta_right mb1 mt1">
        ${nextBtn}
      </div>`,
  );
};

async function main() {
  await writeFile(resolve(SCENARIO_DIR, "01-search.html"), searchHtml);
  console.log("built 01-search.html");
  for (const cfg of listConfigs) {
    await writeFile(resolve(SCENARIO_DIR, cfg.file), listHtml(cfg));
    console.log(`built ${cfg.file}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
