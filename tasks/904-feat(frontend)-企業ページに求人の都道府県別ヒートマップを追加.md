---
number: 904
title: "feat(frontend): 企業ページに求人の都道府県別ヒートマップを追加"
state: open
author: shidari
labels: []
url: https://github.com/shidari/hello-work-software-jobs/issues/904
createdAt: 2026-04-19T11:18:09Z
updatedAt: 2026-04-21T06:09:21Z
---

## 概要

ある企業の複数求人に対して、募集場所を日本地図上でビジュアライズする機能を追加したい。都道府県単位の塗り分け（choropleth）で、どの地域に求人が集中しているかを一目で把握できるようにする。

## モチベーション

- 全国チェーンの企業など、求人が複数都道府県に散らばるケースで「どこで募集しているか」がカード一覧だと掴みにくい
- 都道府県フィルターを選ぶ前の概観として地図があると UX が良い

## 調査内容

> 以下は Claude Code による調査メモ。

### 技術選定

React で日本地図を扱う主な選択肢：

| ライブラリ | 特徴 | 向き |
|-----------|------|------|
| `@react-map/japan` | 47 都道府県の SVG コンポーネント | 手軽だが拡張性低 |
| `react-simple-maps` | TopoJSON を渡して描画。d3-geo ベース | 🟢 都道府県塗り分けの定番 |
| `deck.gl` | WebGL。`HeatmapLayer` で密度表現 | 座標点ベース・重量級 |
| 静的 SVG 直貼り | `<path id=\"tokyo\">` で分かれた SVG を CSS で塗る | 最軽量・インタラクション限定的 |

**選定: `react-simple-maps` + 日本 TopoJSON**

理由:
- 都道府県粒度で十分（市区町村や座標プロットは不要）
- TopoJSON に 47 都道府県の形状が含まれるので自前で座標を持たなくていい
- 各都道府県は `<path>` 1 個なので、`fill` / `onClick` / `onMouseEnter` で塗り分け・インタラクションが標準 SVG 属性で完結
- バンドル軽量、RSC とも相性 OK（表示部分は Client Component 化が必要）

### データソース

- TopoJSON: [dataofjapan/land](https://github.com/dataofjapan/land) の \`japan.topojson\`
- 都道府県の識別: \`properties.nam_ja\`（日本語名）

### 実装スケッチ

\`\`\`tsx
\"use client\";
import { ComposableMap, Geographies, Geography } from \"react-simple-maps\";
import { scaleSequential } from \"d3-scale\";
import { interpolateBlues } from \"d3-scale-chromatic\";

type Props = { countsByPref: Record<string, number> };

export function JapanJobMap({ countsByPref }: Props) {
  const max = Math.max(1, ...Object.values(countsByPref));
  const color = scaleSequential(interpolateBlues).domain([0, max]);

  return (
    <ComposableMap
      projection=\"geoMercator\"
      projectionConfig={{ center: [137, 38], scale: 1000 }}
    >
      <Geographies geography=\"/japan.topojson\">
        {({ geographies }) =>
          geographies.map((geo) => {
            const name = geo.properties.nam_ja;
            const count = countsByPref[name] ?? 0;
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={count ? color(count) : \"#eee\"}
                stroke=\"#fff\"
              />
            );
          })
        }
      </Geographies>
    </ComposableMap>
  );
}
\`\`\`

### 依存追加

\`\`\`bash
pnpm add react-simple-maps d3-scale d3-scale-chromatic
pnpm add -D @types/react-simple-maps
\`\`\`

## 実装タスク

### Frontend
- [ ] \`apps/frontend/hello-work-job-searcher/public/japan.topojson\` を配置
- [ ] \`JapanJobMap\` コンポーネントを \`src/features/\` 配下に実装（Client Component）
- [ ] ホバーで都道府県名 + 求人件数を表示するツールチップ
- [ ] クリックで当該都道府県のフィルター済み一覧にナビゲート（任意）
- [ ] Storybook に追加（モックデータ使用）

### API/集計
- [ ] 企業単位で都道府県別の求人件数を返すクエリを検討（既存 \`/jobs\` の集計で足りるか、新規エンドポイント \`/companies/:establishmentNumber/stats\` 的なものが必要か要判断）
- [ ] RSC から集計取得して props で \`JapanJobMap\` に渡す

### 懸念点
- [ ] \`react-simple-maps\` v3 の peer deps は React 18。React 19 でも実動作するが、\`pnpm.overrides\` での調整が必要な可能性
- [ ] 沖縄が投影の関係で左下に離れる。気になるなら TopoJSON を加工 or 別 SVG で描画
- [ ] 求人データの勤務地が住所文字列のみの場合、都道府県抽出のパースが必要（頭の「〇〇県」「〇〇都」「〇〇府」「北海道」の 4 パターン）

## 参考

- [react-simple-maps](https://www.react-simple-maps.io/)
- [dataofjapan/land](https://github.com/dataofjapan/land)
- [d3-scale-chromatic](https://github.com/d3/d3-scale-chromatic)


